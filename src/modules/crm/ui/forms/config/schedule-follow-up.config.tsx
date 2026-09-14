"use client";

import { z } from "zod";
import type { ActivityDTO, CreateAgentTaskDTO, UpdateAgentTaskDTO } from "@/modules/crm/domain/activity";
import {
  businessDateTimeToIso,
  defaultOpeningParams,
  isInPast,
  isoToBusinessDateTime,
  windowNotice,
  type ContactReachabilityDTO,
  type FollowUpMedium,
  type OpeningTemplateInput,
} from "@/modules/crm/domain/schedule-follow-up";
import { countTemplateVariables, type HsmTemplateDTO } from "@/modules/marketing/public";

export const NO_AGENT = "__none__";
export const NO_TEMPLATE = "__none__";

/** Tope del backend (`objective` de `CreateAgentTaskDto`). */
export const OBJECTIVE_MAX = 500;
export const OBJECTIVE_MIN = 12;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

/**
 * Medios disponibles HOY. Las llamadas llegan con F3 del programa (el dominio
 * ya las conoce y el selector las pinta deshabilitadas con su explicación):
 * cuando el backend acepte `task_channel`, esta lista se amplía y nada más.
 */
export const AVAILABLE_MEDIA: readonly FollowUpMedium[] = ["message"];

export type ScheduleFollowUpValues = {
  contact: { id: string; label: string } | null;
  agent_id: string;
  medium: FollowUpMedium;
  objective: string;
  /** Fecha y hora de PARED del negocio (zona de la empresa, no del navegador). */
  date: string;
  time: string;
  /** `NO_TEMPLATE` = sin apertura. */
  opening_template_id: string;
  topic: string;
};

/**
 * El esquema se CONSTRUYE con lo que el formulario sabe en ese momento —zona,
 * reloj, si hace falta plantilla, si la plantilla elegida usa «tema»— porque
 * esas reglas no son del formulario: son del contacto y de la hora.
 */
export function buildScheduleFollowUpSchema(rules: {
  tz: string;
  now: Date;
  /** Alcanzabilidad del contacto; `null` = aún no se sabe (no se exige plantilla). */
  reach: ContactReachabilityDTO | null;
  /** Plantillas aprobadas disponibles para abrir. */
  templates: readonly HsmTemplateDTO[];
}): z.ZodType<ScheduleFollowUpValues> {
  return z
    .object({
      contact: z
        .object({ id: z.string(), label: z.string() })
        .nullable()
        .refine((value) => value !== null, "Selecciona el contacto"),
      agent_id: z.string(),
      medium: z.enum(["message", "call", "call_then_message"]),
      objective: z.string(),
      date: z.string(),
      time: z.string(),
      opening_template_id: z.string(),
      topic: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.agent_id === NO_AGENT || values.agent_id === "") {
        ctx.addIssue({ code: "custom", path: ["agent_id"], message: "Elige qué agente lo hace" });
      }
      if (!AVAILABLE_MEDIA.includes(values.medium)) {
        ctx.addIssue({ code: "custom", path: ["medium"], message: "Ese medio aún no está disponible" });
      }
      const objective = values.objective.trim();
      if (objective.length < OBJECTIVE_MIN) {
        ctx.addIssue({
          code: "custom",
          path: ["objective"],
          message: "Describe el objetivo con algo más de detalle",
        });
      } else if (objective.length > OBJECTIVE_MAX) {
        ctx.addIssue({ code: "custom", path: ["objective"], message: `Máximo ${String(OBJECTIVE_MAX)} caracteres` });
      }
      if (!DATE_REGEX.test(values.date)) {
        ctx.addIssue({ code: "custom", path: ["date"], message: "Elige una fecha" });
      }
      if (!TIME_REGEX.test(values.time)) {
        ctx.addIssue({ code: "custom", path: ["time"], message: "Elige una hora" });
      }
      if (
        DATE_REGEX.test(values.date) &&
        TIME_REGEX.test(values.time) &&
        isInPast(values.date, values.time, rules.tz, rules.now)
      ) {
        ctx.addIssue({ code: "custom", path: ["time"], message: "Esa hora ya pasó" });
      }
      // La plantilla se exige si, A LA HORA ELEGIDA, el contacto estará fuera
      // de la ventana de 24 h y hay plantillas con las que abrir — la misma
      // regla que pinta el aviso, evaluada con los mismos datos.
      const scheduled =
        DATE_REGEX.test(values.date) && TIME_REGEX.test(values.time)
          ? businessDateTimeToIso(values.date, values.time, rules.tz)
          : null;
      const notice = windowNotice(rules.reach, "", rules.tz, rules.templates.length > 0, scheduled, rules.now);
      if (values.medium !== "call" && notice.needs_template && values.opening_template_id === NO_TEMPLATE) {
        ctx.addIssue({
          code: "custom",
          path: ["opening_template_id"],
          message: "Elige con qué plantilla abre el agente",
        });
      }
      const template = rules.templates.find((item) => item.id === values.opening_template_id);
      if (
        template !== undefined &&
        defaultOpeningParams(countTemplateVariables(template.body)).includes("topic") &&
        values.topic.trim().length < 2
      ) {
        ctx.addIssue({ code: "custom", path: ["topic"], message: "Escribe el tema que rellena la plantilla" });
      }
    }) as unknown as z.ZodType<ScheduleFollowUpValues>;
}

export function defaultScheduleFollowUpValues(preset: {
  contact?: { id: string; label: string };
  /** Primer atajo de fecha, ya en la zona del negocio. */
  shortcut?: { date: string; time: string };
}): ScheduleFollowUpValues {
  return {
    contact: preset.contact ?? null,
    agent_id: NO_AGENT,
    medium: "message",
    objective: "",
    date: preset.shortcut?.date ?? "",
    time: preset.shortcut?.time ?? "09:00",
    opening_template_id: NO_TEMPLATE,
    topic: "",
  };
}

/** Edición: se edita sobre `due_at`, que es lo que el operador pidió. */
export function editScheduleFollowUpValues(
  task: ActivityDTO,
  tz: string,
  contact?: { id: string; label: string },
): ScheduleFollowUpValues {
  const when =
    task.due_at === null ? { date: "", time: "09:00" } : isoToBusinessDateTime(task.due_at, tz);
  return {
    contact: contact ?? { id: task.contact_id, label: "" },
    agent_id: task.assigned_agent_id ?? NO_AGENT,
    medium: "message",
    objective: task.objective ?? "",
    date: when.date,
    time: when.time,
    opening_template_id: task.opening_template?.channel_template_id ?? NO_TEMPLATE,
    topic: task.opening_template?.topic ?? "",
  };
}

/**
 * Los `params` de la plantilla se derivan de su cuerpo con la regla fija
 * {{1}} nombre · {{2}} tema · resto empresa: el operador solo escribe el tema.
 * Es la misma decisión que el backend impone — variables deterministas, jamás
 * texto del modelo.
 */
export function openingTemplateInput(
  values: ScheduleFollowUpValues,
  template: HsmTemplateDTO | undefined,
): OpeningTemplateInput | null {
  if (values.opening_template_id === NO_TEMPLATE || template === undefined) return null;
  const params = defaultOpeningParams(countTemplateVariables(template.body));
  const topic = values.topic.trim();
  return {
    channel_template_id: template.id,
    params,
    ...(params.includes("topic") ? { topic } : {}),
  };
}

export function toCreateFollowUpDTO(
  values: ScheduleFollowUpValues,
  ctx: { tz: string; deal_id?: string; template: HsmTemplateDTO | undefined },
): CreateAgentTaskDTO {
  const opening = openingTemplateInput(values, ctx.template);
  return {
    contact_id: (values.contact as { id: string }).id,
    assigned_agent_id: values.agent_id,
    objective: values.objective.trim(),
    due_at: businessDateTimeToIso(values.date, values.time, ctx.tz),
    ...(ctx.deal_id === undefined ? {} : { deal_id: ctx.deal_id }),
    ...(opening === null ? {} : { opening_template: opening }),
  };
}

/** Reprogramar mueve `due_at` y `next_run_at` a la vez y reinicia los intentos. */
export function toUpdateFollowUpDTO(
  values: ScheduleFollowUpValues,
  ctx: { tz: string; template: HsmTemplateDTO | undefined },
): UpdateAgentTaskDTO {
  return {
    objective: values.objective.trim(),
    due_at: businessDateTimeToIso(values.date, values.time, ctx.tz),
    assigned_agent_id: values.agent_id,
    // `null` quita la plantilla; el backend distingue ausente de null.
    opening_template: openingTemplateInput(values, ctx.template),
  };
}
