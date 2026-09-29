import type { Schemas } from "@/core/api/types";

/**
 * Política de contacto del tenant (P1 del piloto de captación). La dueña del
 * dato es `contacts` en el servidor (`/contacts/outreach-policy`); la pantalla
 * vive en Marketing › Configuración porque ahí se decide cómo se abre contacto.
 *
 * Módulo PURO: tipos del contrato, qué canales se muestran y con qué texto,
 * cuándo un modo es de riesgo alto y cómo se resume un cambio sin guardar.
 */

export type OutreachPolicyView = Schemas["OutreachPolicyViewDto"];
export type OutreachPolicy = OutreachPolicyView["policy"];
export type OutreachChannelKey = keyof OutreachPolicy["channels"];
export type OutreachChannelPolicy = OutreachPolicy["channels"][OutreachChannelKey];
export type OutreachMode = OutreachChannelPolicy["mode"];
export type OutreachHours = OutreachPolicy["hours"];
export type OutreachTimeRange = OutreachHours["weekdays"];

/** Cómo elige el tenant el modo de un canal. */
export type ChannelChoice =
  /** Solo con opt-in · A cualquier lead. */
  | { kind: "mode" }
  /** Meta decide: solo si ya escribió. No hay elección, solo el interruptor. */
  | { kind: "fixed"; label: string };

export interface OutreachChannelMeta {
  key: OutreachChannelKey;
  label: string;
  description: string;
  choice: ChannelChoice;
  /**
   * `true` = abrirlo «a cualquier lead» pone en juego un número del tenant
   * (bloqueos que bajan su calidad): se marca como riesgo alto.
   */
  number_at_stake: boolean;
}

/**
 * Los canales que se muestran, en el orden del tablero. Fuera, a propósito:
 * `manual` (una persona siempre puede escribir a mano) y `whatsapp_web`
 * (retirado del producto el 2026-09-03; el valor sigue en el enum).
 */
export const OUTREACH_CHANNELS_SHOWN: readonly OutreachChannelMeta[] = [
  {
    key: "email",
    label: "Correo",
    description:
      "Al correo publicado, con baja en un clic. Es el canal más seguro para un lead frío.",
    choice: { kind: "mode" },
    number_at_stake: false,
  },
  {
    key: "call",
    label: "Llamada de la agente",
    description:
      "Abre con el aviso legal y se graba en axi. Solo dentro del horario de contacto.",
    choice: { kind: "mode" },
    number_at_stake: false,
  },
  {
    key: "sms",
    label: "SMS",
    description: "Útil como recordatorio, no como apertura. Lleva la forma de darse de baja.",
    choice: { kind: "mode" },
    number_at_stake: true,
  },
  {
    key: "whatsapp_cloud",
    label: "WhatsApp · plantilla",
    description:
      "Meta pide consentimiento. Si lo abres a cualquier lead, cada bloqueo baja la calidad de tu número: es el mismo número de tu agente y de tus clientes.",
    choice: { kind: "mode" },
    number_at_stake: true,
  },
  {
    key: "instagram_dm",
    label: "Instagram",
    description:
      "Meta no deja abrir un chat por API con quien nunca te escribió. Si ya escribió, Axi responde en automático.",
    choice: { kind: "fixed", label: "Si ya escribió" },
    number_at_stake: false,
  },
  {
    key: "facebook_messenger",
    label: "Facebook Messenger",
    description: "El mismo límite de Meta que Instagram: responde en automático a quien ya escribió.",
    choice: { kind: "fixed", label: "Si ya escribió" },
    number_at_stake: false,
  },
];

export const MODE_OPTIONS: readonly { value: Extract<OutreachMode, "opt_in_only" | "any_lead">; label: string }[] = [
  { value: "opt_in_only", label: "Solo con opt-in" },
  { value: "any_lead", label: "A cualquier lead" },
];

/** ¿Este canal, así configurado, pone en riesgo un número del tenant? */
export function isHighRisk(meta: OutreachChannelMeta, policy: OutreachChannelPolicy): boolean {
  return meta.number_at_stake && policy.enabled && policy.mode === "any_lead";
}

/** «7:00» a partir de «07:00»: la hora se lee sin el cero de relleno. */
export function formatHour(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":");
  return `${Number(hours)}:${minutes}`;
}

function minutesOf(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Espejo de `withinFloor` del servidor: el tenant estrecha, nunca abre más. */
export function rangeWithinFloor(range: OutreachTimeRange, floor: OutreachTimeRange | null): boolean {
  if (floor === null) return false;
  return (
    minutesOf(range.start) >= minutesOf(floor.start) &&
    minutesOf(range.end) <= minutesOf(floor.end) &&
    minutesOf(range.start) < minutesOf(range.end)
  );
}

export interface HoursErrors {
  weekdays?: string;
  saturday?: string;
}

export function validateHours(hours: OutreachHours, floor: OutreachPolicyView["floor"]): HoursErrors {
  const errors: HoursErrors = {};
  if (!rangeWithinFloor(hours.weekdays, floor.weekdays)) {
    errors.weekdays = `Entre ${formatHour(floor.weekdays.start)} y ${formatHour(floor.weekdays.end)}, y el inicio antes del fin`;
  }
  if (hours.saturday !== null && !rangeWithinFloor(hours.saturday, floor.saturday)) {
    errors.saturday =
      floor.saturday === null
        ? "El sábado está cerrado"
        : `Entre ${formatHour(floor.saturday.start)} y ${formatHour(floor.saturday.end)}, y el inicio antes del fin`;
  }
  return errors;
}

/**
 * La frase de la barra de guardar: el cambio que más importa, en voz de axi.
 * Abrir un canal de riesgo alto va primero —con su consecuencia como
 * detalle— porque es lo que el dueño tiene que ver antes de guardar; si no,
 * cuántos cambios hay. `null` = nada que guardar.
 */
export function describeChanges(
  before: OutreachPolicy,
  after: OutreachPolicy,
): { title: string; detail?: string } | null {
  const opened = OUTREACH_CHANNELS_SHOWN.find(
    (meta) => isHighRisk(meta, after.channels[meta.key]) && !isHighRisk(meta, before.channels[meta.key]),
  );
  if (opened !== undefined) {
    return {
      title: `Abriste ${opened.label} a cualquier lead`,
      detail: "el riesgo queda escrito en cada envío",
    };
  }
  let count = 0;
  for (const meta of OUTREACH_CHANNELS_SHOWN) {
    const a = before.channels[meta.key];
    const b = after.channels[meta.key];
    if (a.enabled !== b.enabled || a.mode !== b.mode) count += 1;
  }
  if (JSON.stringify(before.hours) !== JSON.stringify(after.hours)) count += 1;
  if (count === 0) return null;
  return { title: count === 1 ? "Un cambio sin guardar" : `${count} cambios sin guardar` };
}
