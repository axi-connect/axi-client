import type { Schemas } from "@/core/api/types";
import { relativeTime } from "@/core/lib/relative-time";
import {
  addDaysToKey,
  businessDayKey,
  hhmmFromInstant,
  instantFromBusiness,
  minutesIntoDay,
  todayKey,
  weekdayOfKey,
  type DayKey,
} from "@/core/lib/business-time";
import { isQuietHour } from "./agent-task-settings";
import { CRM_CALL_TYPES, type CrmCallType } from "@/modules/calls/public";

/**
 * «Programar seguimiento» (F2 del seguimiento autónomo): las funciones puras
 * que deciden qué copy ve el operador antes de programar. TypeScript sin React
 * ni http — todo lo que aquí se calcula se prueba con un reloj y una zona
 * inyectados.
 */

export type ContactReachabilityDTO = Schemas["ContactReachabilityDto"];
export type OpeningTemplateInput = NonNullable<Schemas["CreateAgentTaskDto"]["opening_template"]>;
export type OpeningTemplateParam = OpeningTemplateInput["params"][number];

/** Cómo contacta. Las llamadas llegan con F3; el dominio ya las conoce. */
export type FollowUpMedium = "message" | "call" | "call_then_message";

export const FOLLOW_UP_MEDIA: ReadonlyArray<{
  value: FollowUpMedium;
  label: string;
  description: string;
}> = [
  { value: "message", label: "Mensaje", description: "Le escribe por WhatsApp y sigue el chat." },
  { value: "call", label: "Llamada", description: "Le llama con voz y conversa en vivo." },
  {
    value: "call_then_message",
    label: "Llamada y, si no conecta, mensaje",
    description: "Tras agotar los intentos de llamada, cambia a mensaje.",
  },
];

/** Ejemplos que rellenan el objetivo con un clic: enseñan el tono esperado. */
export const OBJECTIVE_EXAMPLES: readonly string[] = [
  "Preguntarle si recibió la propuesta y qué le pareció",
  "Recordarle que la promoción vence el viernes y ofrecer ayuda para decidir",
  "Reactivar: saber si sigue interesado y qué le frenó",
];

/* ─────────────────────────── Cuándo ─────────────────────────── */

const DEFAULT_HOUR = "09:00";
const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export type DateShortcut = {
  key: "tomorrow" | "in_3_days" | "next_monday";
  label: string;
  date: DayKey;
  time: string;
};

/** Atajos de fecha en la zona del negocio. `now` se inyecta por testabilidad. */
export function dateShortcuts(now: Date, tz: string): DateShortcut[] {
  const today = todayKey(now, tz);
  const tomorrow = addDaysToKey(today, 1);
  const inThree = addDaysToKey(today, 3);
  const dow = weekdayOfKey(today); // 0 = domingo
  const untilMonday = dow === 1 ? 7 : (8 - dow) % 7 || 7;
  const monday = addDaysToKey(today, untilMonday);
  return [
    { key: "tomorrow", label: "Mañana 9:00", date: tomorrow, time: DEFAULT_HOUR },
    {
      key: "in_3_days",
      label: `En 3 días · ${WEEKDAY_LABELS[weekdayOfKey(inThree)]} 9:00`,
      date: inThree,
      time: DEFAULT_HOUR,
    },
    { key: "next_monday", label: "Lunes 9:00", date: monday, time: DEFAULT_HOUR },
  ];
}

/** Fecha+hora de pared del negocio → instante ISO para el backend. */
export function businessDateTimeToIso(date: DayKey, time: string, tz: string): string {
  return instantFromBusiness(date, time, tz);
}

/** Instante ISO → {date, time} de pared del negocio (edición). */
export function isoToBusinessDateTime(iso: string, tz: string): { date: DayKey; time: string } {
  return { date: businessDayKey(iso, tz), time: hhmmFromInstant(iso, tz) };
}

export function isInPast(date: DayKey, time: string, tz: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  return new Date(businessDateTimeToIso(date, time, tz)).getTime() <= now.getTime();
}

export type QuietHoursShift =
  | { quiet: false }
  | { quiet: true; resumes_at: { date: DayKey; time: string }; window: string };

/**
 * Si la hora elegida cae en el horario silencioso, cuándo saldrá de verdad:
 * la siguiente hora de fin del silencio, hoy o mañana. Misma aritmética que
 * `isQuietHour` (que espeja al motor), así el aviso no promete algo distinto
 * de lo que hará el backend.
 */
export function quietHoursShift(
  date: DayKey,
  time: string,
  start: number,
  end: number,
): QuietHoursShift {
  if (!/^\d{2}:\d{2}$/.test(time) || start === end) return { quiet: false };
  const hour = Number(time.slice(0, 2));
  if (!isQuietHour(hour, start, end)) return { quiet: false };
  // Cruza medianoche y estamos antes de medianoche → el fin es mañana
  const resumesTomorrow = end <= hour;
  return {
    quiet: true,
    resumes_at: {
      date: resumesTomorrow ? addDaysToKey(date, 1) : date,
      time: `${String(end).padStart(2, "0")}:00`,
    },
    window: `${formatClockHour(start)}–${formatClockHour(end)}`,
  };
}

export function formatClockHour(hour: number): string {
  const suffix = hour < 12 ? "a. m." : "p. m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)}:00 ${suffix}`;
}

function formatBusinessClock(iso: string, tz: string): string {
  const minutes = minutesIntoDay(iso, tz);
  const hour = Math.floor(minutes / 60);
  const suffix = hour < 12 ? "a. m." : "p. m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

/* ─────────────────── Estado del contacto en WhatsApp ─────────────────── */

export type WindowNotice = {
  tone: "ok" | "info" | "warn" | "muted";
  title: string;
  body: string;
  /** El formulario debe pedir una plantilla de apertura. */
  needs_template: boolean;
  /** No hay forma de abrir ahora: el mensaje saldrá cuando el cliente escriba. */
  waits_for_customer: boolean;
};

const REASON_COPY: Record<NonNullable<ContactReachabilityDTO["reason"]>, string> = {
  no_channel: "no tiene ningún canal de WhatsApp o redes conectado",
  channel_not_found: "su canal ya no existe",
  channel_not_connected: "su canal está desconectado",
  unsupported_channel_kind: "su canal no admite mensajes del agente",
  no_contact_identity: "no tiene identidad en el canal conectado",
  outside_service_window: "no ha escrito en más de 24 h",
};

/**
 * El aviso en vivo del formulario. Dice lo MISMO que hará el motor (la
 * consulta de alcanzabilidad refleja al turno proactivo), y su función es que
 * el operador entienda la ventana de 24 h de WhatsApp sin saber que existe.
 */
export function windowNotice(
  reach: ContactReachabilityDTO | null,
  firstName: string,
  tz: string,
  hasApprovedTemplates: boolean,
  /** Instante programado: la ventana se evalúa a ESA hora, no ahora. */
  scheduledIso: string | null,
  now: Date = new Date(),
): WindowNotice {
  const name = firstName.trim() === "" ? "El contacto" : firstName.trim();
  if (reach === null) {
    return {
      tone: "muted",
      title: "Comprobando cómo llegarle…",
      body: "",
      needs_template: false,
      waits_for_customer: false,
    };
  }
  if (reach.can_message_now) {
    if (reach.window_hours === null || reach.last_inbound_at === null) {
      return {
        tone: "ok",
        title: `${name} puede recibir el mensaje a cualquier hora.`,
        body: "Su canal no tiene ventana de 24 h.",
        needs_template: false,
        waits_for_customer: false,
      };
    }
    const closesAt = new Date(reach.last_inbound_at).getTime() + reach.window_hours * 3_600_000;
    const until = new Date(closesAt).toISOString();
    const scheduledAt = scheduledIso === null ? Number.NaN : new Date(scheduledIso).getTime();
    // Está dentro AHORA, pero la tarea es para después de que cierre la
    // ventana: a esa hora hará falta plantilla igual que con un contacto frío.
    if (!Number.isNaN(scheduledAt) && scheduledAt >= closesAt) {
      const closesText = `${formatWhen(until, tz)}`;
      if (reach.supports_templates && hasApprovedTemplates) {
        return {
          tone: "info",
          title: `${name} escribió ${relativeTime(reach.last_inbound_at, now)}, pero a esa hora la ventana de 24 h ya habrá cerrado.`,
          body: `Cierra el ${closesText}. El agente abrirá con una plantilla aprobada y retomará el objetivo cuando responda.`,
          needs_template: true,
          waits_for_customer: false,
        };
      }
      return {
        tone: "warn",
        title: `A esa hora la ventana de 24 h de ${name} ya habrá cerrado${reach.supports_templates ? " y no tienes plantillas aprobadas" : ""}.`,
        body: `Cierra el ${closesText}. Adelanta la tarea, o el mensaje saldrá cuando vuelva a escribir.`,
        needs_template: false,
        waits_for_customer: true,
      };
    }
    return {
      tone: "ok",
      title: `${name} escribió ${relativeTime(reach.last_inbound_at, now)}.`,
      body: `Puede recibir un mensaje del agente hasta las ${formatBusinessClock(until, tz)}; después WhatsApp exige una plantilla aprobada.`,
      needs_template: false,
      waits_for_customer: false,
    };
  }
  if (reach.reason === "outside_service_window") {
    if (reach.supports_templates && hasApprovedTemplates) {
      return {
        tone: "info",
        title: `${name} no ha escrito en más de 24 h.`,
        body: "WhatsApp solo permite abrir con una plantilla aprobada por Meta; el agente retoma el objetivo cuando responda.",
        needs_template: true,
        waits_for_customer: false,
      };
    }
    return {
      tone: "warn",
      title: `${name} no ha escrito en más de 24 h${reach.supports_templates ? " y no tienes plantillas aprobadas" : " y este canal no admite plantillas"}.`,
      body: "El mensaje saldrá cuando vuelva a escribir. El agente atenderá el objetivo dentro de esa misma respuesta.",
      needs_template: false,
      waits_for_customer: true,
    };
  }
  return {
    tone: "warn",
    title: `${name} ${REASON_COPY[reach.reason ?? "no_channel"]}.`,
    body: "La tarea se programará igual y quedará en espera hasta que el contacto sea alcanzable.",
    needs_template: false,
    waits_for_customer: true,
  };
}

/* ─────────────────── La promesa del footer ─────────────────── */

export function promiseSentence(input: {
  agent_name: string;
  contact_first_name: string;
  iso: string;
  tz: string;
  medium: FollowUpMedium;
  opens_with_template: boolean;
  waits_for_customer: boolean;
  quiet_shift: QuietHoursShift;
}): { headline: string; detail: string } {
  const name = input.contact_first_name.trim() || "el contacto";
  const when = formatWhen(input.iso, input.tz);
  const verb =
    input.medium === "message"
      ? "le escribirá"
      : input.medium === "call"
        ? "llamará"
        : "llamará y, si no conecta, le escribirá";
  const shifted = input.quiet_shift.quiet
    ? ` Como cae en horario silencioso, saldrá a las ${input.quiet_shift.resumes_at.time.replace(/^0/, "")}.`
    : "";
  // La espera por la ventana de 24 h es de MENSAJES: una llamada sale en la
  // fecha elegida aunque el contacto no haya escrito.
  if (input.waits_for_customer && input.medium === "message") {
    return {
      headline: `${input.agent_name} ${verb} a ${name} cuando vuelva a escribir.`,
      detail: "Hasta entonces la tarea queda en espera; el objetivo se atiende dentro de esa respuesta.",
    };
  }
  const detail =
    input.medium === "call"
      ? "Lleva la llamada con su tono, su catálogo y sus reglas."
      : input.medium === "call_then_message" && input.waits_for_customer
        ? "Si no conecta, el mensaje queda en espera hasta que vuelva a escribir."
        : input.opens_with_template
          ? "Abre con la plantilla y retoma el objetivo cuando responda."
          : "Redacta el mensaje con su tono, su catálogo y sus reglas.";
  return {
    // `when` ya termina en «a. m.» / «p. m.»: no se añade otro punto.
    headline: `${input.agent_name} ${verb} a ${name} el ${when}`,
    detail: detail + shifted,
  };
}

function formatWhen(iso: string, tz: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "…";
  const parts = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: tz,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value?.replace(".", "") ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} a las ${formatBusinessClock(iso, tz)}`;
}

/** Lo guardado en la tarea si es un marco del CRM; si no, el de siempre. */
export function asCrmCallType(value: string | null | undefined): CrmCallType {
  return (CRM_CALL_TYPES as readonly string[]).includes(value ?? "") ? (value as CrmCallType) : "followup";
}

