"use client";

import { z } from "zod";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form";
import {
  ACTIVITY_KIND_LABELS,
  type ActivityDTO,
  type ActivityKind,
  type CreateActivityDTO,
  type CreateAgentTaskDTO,
  type UpdateActivityDTO,
  type UpdateAgentTaskDTO,
} from "@/modules/crm/domain/activity";
import type { AssignableAgent } from "@/modules/agents/public";
import { ContactPicker } from "@/modules/crm/ui/forms/ContactPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const NO_ASSIGNEE = "__none__";

/** Tope del backend (`objective` de `CreateAgentTaskDto`). */
const OBJECTIVE_MAX = 600;
const OBJECTIVE_MIN = 12;

/**
 * Config del formulario de actividad/tarea (POST /crm/activities). El mismo
 * config sirve desde la bandeja, el 360 y el rail del deal: `isVisible` por
 * kind gobierna vencimiento y asignación (solo tareas — CHECK del backend).
 */
export const activityFormSchema = z
  .object({
    contact: z
      .object({ id: z.string(), label: z.string() })
      .nullable()
      .refine((value) => value !== null, "Selecciona el contacto"),
    kind: z.enum(["note", "call", "meeting", "task"]),
    // Sin `min(1)` aquí: en el ramal de IA el campo NO se pinta (el backend
    // deriva el título del objetivo), y exigirlo bloquearía el guardado con un
    // error que no tiene dónde mostrarse. La obligatoriedad va al superRefine,
    // donde sí se sabe si el campo está visible.
    title: z.string().trim().max(200),
    body: z.string().trim().max(2000).optional().or(z.literal("")),
    due_at: z.string(),
    assigned_user_id: z.string(),
    /** Quién ejecuta. Solo tiene sentido en `kind === "task"`. */
    executor: z.enum(["user", "agent"]),
    assigned_agent_id: z.string(),
    objective: z.string(),
  })
  .superRefine((values, ctx) => {
    const agentBranch = values.kind === "task" && values.executor === "agent";
    if (!agentBranch && values.title.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["title"], message: "Título requerido" });
    }
    if (values.kind !== "task") return;
    if (values.due_at.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["due_at"],
        message: "Una tarea necesita fecha de vencimiento",
      });
    }
    if (values.executor !== "agent") return;

    if (values.assigned_agent_id === NO_ASSIGNEE || values.assigned_agent_id === "") {
      ctx.addIssue({
        code: "custom",
        path: ["assigned_agent_id"],
        message: "Elige qué agente la ejecuta",
      });
    }
    // El objetivo es lo ÚNICO que el agente va a leer. Un objetivo de tres
    // palabras produce un mensaje genérico, así que el mínimo se valida aquí
    // (el backend lo repite: esto es comodidad, no la garantía).
    const objective = values.objective.trim();
    if (objective.length < OBJECTIVE_MIN) {
      ctx.addIssue({
        code: "custom",
        path: ["objective"],
        message: "Describe el objetivo con algo más de detalle",
      });
    }
    if (objective.length > OBJECTIVE_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["objective"],
        message: `Máximo ${String(OBJECTIVE_MAX)} caracteres`,
      });
    }
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export function defaultActivityFormValues(preset?: {
  contact?: { id: string; label: string };
  kind?: ActivityKind;
  executor?: "user" | "agent";
}): ActivityFormValues {
  return {
    contact: preset?.contact ?? null,
    kind: preset?.kind ?? "task",
    title: "",
    body: "",
    due_at: "",
    assigned_user_id: NO_ASSIGNEE,
    // Por defecto la ejecuta una persona: que la IA escriba a un cliente es
    // una decisión, nunca un default silencioso.
    executor: preset?.executor ?? "user",
    assigned_agent_id: NO_ASSIGNEE,
    objective: "",
  };
}

/** Es tarea Y la ejecuta un agente: la condición de todo el ramal de IA. */
function isAgentBranch(values: ActivityFormValues): boolean {
  return values.kind === "task" && values.executor === "agent";
}

function isHumanTask(values: ActivityFormValues): boolean {
  return values.kind === "task" && values.executor === "user";
}

export function buildActivityFormFields(options: {
  users: Array<{ id: string; name: string }>;
  /** Contacto fijado (desde el 360/rail): el picker se deshabilita. */
  contactLocked: boolean;
  /** Agentes activos del tenant. Vacío = el ramal de IA no se ofrece. */
  agents?: readonly AssignableAgent[];
  /** En edición el tipo y el ejecutor no se cambian: son otra entidad. */
  locked?: boolean;
}): ReadonlyArray<FieldConfig<ActivityFormValues>> {
  const agents = options.agents ?? [];
  return [
    createCustomField<ActivityFormValues>(
      "contact",
      ({ value, setValue, getError }) =>
        options.contactLocked ? (
          <p className="flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm">
            {(value as ActivityFormValues["contact"])?.label}
          </p>
        ) : (
          <ContactPicker
            value={value as ActivityFormValues["contact"]}
            onChange={(contact) => setValue("contact", contact)}
            error={getError()}
          />
        ),
      { label: "Contacto" },
    ),
    createCustomField<ActivityFormValues>(
      "kind",
      ({ value, setValue }) => (
        <select
          value={value as ActivityKind}
          onChange={(e) => setValue("kind", e.target.value as ActivityKind)}
          disabled={options.locked === true}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
          aria-label="Tipo de actividad"
        >
          {(Object.keys(ACTIVITY_KIND_LABELS) as ActivityKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {ACTIVITY_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      ),
      { label: "Tipo" },
    ),
    createCustomField<ActivityFormValues>(
      "executor",
      ({ value, setValue }) => (
        <select
          value={value as "user" | "agent"}
          onChange={(e) => setValue("executor", e.target.value as "user" | "agent")}
          disabled={options.locked === true || agents.length === 0}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
          aria-label="Quién la ejecuta"
        >
          <option value="user">Una persona del equipo</option>
          <option value="agent" disabled={agents.length === 0}>
            Un agente de IA
          </option>
        </select>
      ),
      {
        label: "Quién la ejecuta",
        // Sin agentes activos el ramal no se ofrece siquiera: el backend
        // devolvería `crm/agent_not_active` y sería una promesa rota.
        isVisible: (values) => values.kind === "task",
        description:
          agents.length === 0
            ? "Activa un agente de IA para poder delegarle seguimientos."
            : undefined,
      },
    ),
    createCustomField<ActivityFormValues>(
      "assigned_agent_id",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          {/* Desviación deliberada al alza: el resto del formulario usa
              `<select>` nativo, pero el de agente es el campo que decide quién
              le habla al cliente y merece el componente del sistema. */}
          <Select
            value={value === NO_ASSIGNEE ? undefined : (value as string)}
            onValueChange={(next) => setValue("assigned_agent_id", next)}
            disabled={options.locked === true}
          >
            <SelectTrigger aria-label="Agente" aria-invalid={Boolean(getError())}>
              <SelectValue placeholder="Elige el agente" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getError() && <p className="text-xs text-destructive">{getError()}</p>}
        </div>
      ),
      { label: "Agente", isVisible: isAgentBranch },
    ),
    createInputField<ActivityFormValues>("objective", {
      label: "Objetivo",
      inputKind: "textarea",
      placeholder:
        "Retomar la cotización del plan anual: preguntarle si la revisó y resolverle dudas de precio.",
      description:
        "Una meta en tus palabras, no un guion. El agente redacta el mensaje con su propio tono, catálogo y reglas.",
      colSpan: { base: 1, md: 2 },
      isVisible: isAgentBranch,
    }),
    createInputField<ActivityFormValues>("title", {
      label: "Título",
      placeholder: "Llamar para confirmar cotización",
      colSpan: { base: 1, md: 2 },
      // En el ramal de IA el título lo deriva el backend del objetivo: pedir
      // los dos sería pedir lo mismo dos veces.
      isVisible: (values) => !isAgentBranch(values),
    }),
    createInputField<ActivityFormValues>("body", {
      label: "Detalle (opcional)",
      inputKind: "textarea",
      colSpan: { base: 1, md: 2 },
      isVisible: (values) => !isAgentBranch(values),
    }),
    createCustomField<ActivityFormValues>(
      "due_at",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <input
            type="datetime-local"
            value={value as string}
            onChange={(e) => setValue("due_at", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Vence"
            aria-invalid={Boolean(getError())}
          />
          {getError() && <p className="text-xs text-destructive">{getError()}</p>}
        </div>
      ),
      // Variante humana: "vence" es un compromiso con una persona.
      { label: "Vence", isVisible: isHumanTask },
    ),
    createCustomField<ActivityFormValues>(
      "due_at",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <input
            type="datetime-local"
            value={value as string}
            onChange={(e) => setValue("due_at", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Cuándo se ejecuta"
            aria-invalid={Boolean(getError())}
          />
          {getError() && <p className="text-xs text-destructive">{getError()}</p>}
        </div>
      ),
      {
        // Variante de IA: aquí la fecha no es un recordatorio, es cuándo sale
        // el mensaje. El motor puede diferirla, nunca adelantarla.
        label: "Cuándo se ejecuta",
        isVisible: isAgentBranch,
        description: "Si el canal no da paso a esa hora, el agente reintenta solo.",
      },
    ),
    createCustomField<ActivityFormValues>(
      "assigned_user_id",
      ({ value, setValue }) => (
        <select
          value={value as string}
          onChange={(e) => setValue("assigned_user_id", e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          aria-label="Asignada a"
        >
          <option value={NO_ASSIGNEE}>Sin asignar</option>
          {options.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      ),
      { label: "Asignada a", isVisible: isHumanTask },
    ),
  ] as const;
}

/**
 * Valores de partida en EDICIÓN.
 *
 * `datetime-local` no acepta un ISO con zona: hay que recortarlo a los minutos
 * en hora local, o el campo aparece vacío y la fecha se pierde al guardar.
 */
export function editActivityFormValues(
  task: ActivityDTO,
  contact?: { id: string; label: string },
): ActivityFormValues {
  const executor = task.assignee_type === "agent" ? "agent" : "user";
  return {
    contact: contact ?? { id: task.contact_id, label: "" },
    kind: task.kind,
    title: task.title ?? "",
    body: task.body ?? "",
    // La de agente se edita sobre `due_at`: `next_run_at` incluye los
    // diferimientos del motor y no es lo que el operador pidió.
    due_at: toLocalInput(task.due_at),
    assigned_user_id: task.assigned_user_id ?? NO_ASSIGNEE,
    executor,
    assigned_agent_id: task.assigned_agent_id ?? NO_ASSIGNEE,
    objective: task.objective ?? "",
  };
}

function toLocalInput(iso: string | null): string {
  if (iso === null) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** El ramal de IA va por `/crm/agent-tasks`: otro permiso y otro DTO. */
export function toCreateAgentTaskDTO(
  values: ActivityFormValues,
  dealId?: string,
): CreateAgentTaskDTO {
  return {
    contact_id: (values.contact as { id: string }).id,
    assigned_agent_id: values.assigned_agent_id,
    objective: values.objective.trim(),
    due_at: new Date(values.due_at).toISOString(),
    ...(dealId === undefined ? {} : { deal_id: dealId }),
  };
}

export function toCreateActivityDTO(
  values: ActivityFormValues,
  dealId?: string,
): CreateActivityDTO {
  const isTask = values.kind === "task";
  return {
    contact_id: (values.contact as { id: string }).id,
    kind: values.kind,
    title: values.title,
    body: values.body || undefined,
    deal_id: dealId ?? undefined,
    due_at: isTask && values.due_at ? new Date(values.due_at).toISOString() : undefined,
    assigned_user_id:
      isTask && values.assigned_user_id !== NO_ASSIGNEE ? values.assigned_user_id : undefined,
  };
}

export function toUpdateActivityDTO(values: ActivityFormValues): UpdateActivityDTO {
  const isTask = values.kind === "task";
  return {
    title: values.title,
    body: values.body || null,
    ...(isTask && values.due_at ? { due_at: new Date(values.due_at).toISOString() } : {}),
    // `null` es explícito: desasignar tiene que poder viajar, y `undefined`
    // en un PATCH significa «no lo toques».
    assigned_user_id:
      isTask && values.assigned_user_id !== NO_ASSIGNEE ? values.assigned_user_id : null,
  };
}

/** Reprogramar mueve `due_at` y `next_run_at` a la vez y reinicia los intentos. */
export function toUpdateAgentTaskDTO(values: ActivityFormValues): UpdateAgentTaskDTO {
  return {
    objective: values.objective.trim(),
    due_at: new Date(values.due_at).toISOString(),
    assigned_agent_id: values.assigned_agent_id,
  };
}
