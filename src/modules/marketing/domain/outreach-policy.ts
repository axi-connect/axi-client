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
export type OutreachColdGuard = OutreachPolicyView["cold_guard"];
export type ColdPauseReason = NonNullable<OutreachColdGuard["whatsapp_pause"]>["reason"];
/** Canales donde existe el «frío controlado» (Fase B del piloto de prospección). */
export type ColdChannelKey = keyof OutreachPolicy["cold"]["daily_cap"];

/** Techo del tope frío del servidor (`COLD_DAILY_CAP_MAX`). */
export const COLD_DAILY_CAP_MAX = 200;

export function isColdChannel(key: OutreachChannelKey): key is ColdChannelKey {
  return key === "whatsapp_cloud" || key === "sms";
}

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
    description:
      "Solo a celulares. Cada SMS lleva la forma de darse de baja («Responde BAJA»; en frío, «NO o BAJA») y la respuesta da de baja sola.",
    choice: { kind: "mode" },
    number_at_stake: true,
  },
  {
    key: "whatsapp_cloud",
    label: "WhatsApp · plantilla",
    description:
      "Meta pide consentimiento. En frío controlado, cada bloqueo baja la calidad de tu número: es el mismo número de tu agente y de tus clientes.",
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

export type ModeOption = {
  value: Extract<OutreachMode, "opt_in_only" | "any_lead" | "cold_controlled">;
  label: string;
};

export const MODE_OPTIONS: readonly ModeOption[] = [
  { value: "opt_in_only", label: "Solo con opt-in" },
  { value: "any_lead", label: "A cualquier lead" },
];

/**
 * En WhatsApp y SMS no hay «a cualquier lead» a secas: escribir sin permiso
 * es SIEMPRE frío controlado, con frenos (el servidor lee un `any_lead`
 * guardado como `cold_controlled`).
 */
export const COLD_MODE_OPTIONS: readonly ModeOption[] = [
  { value: "opt_in_only", label: "Solo con opt-in" },
  { value: "cold_controlled", label: "Frío controlado" },
];

export function modeOptionsFor(key: OutreachChannelKey): readonly ModeOption[] {
  return isColdChannel(key) ? COLD_MODE_OPTIONS : MODE_OPTIONS;
}

/** El valor que enseña el selector: lo que no es «abierto» se ve como opt-in. */
export function selectedMode(key: OutreachChannelKey, mode: OutreachMode): ModeOption["value"] {
  if (isColdChannel(key)) return mode === "cold_controlled" || mode === "any_lead" ? "cold_controlled" : "opt_in_only";
  return mode === "any_lead" ? "any_lead" : "opt_in_only";
}

export function isCold(key: OutreachChannelKey, policy: OutreachChannelPolicy): boolean {
  return isColdChannel(key) && policy.enabled && (policy.mode === "cold_controlled" || policy.mode === "any_lead");
}

/** Los frenos del frío, en una línea cada uno (lo mismo que aplica el servidor). */
export function coldBrakes(key: ColdChannelKey, dailyCap: number): string[] {
  return [
    "Solo a negocios de dato público o referidos; nunca a quien no sabes de dónde salió",
    "Solo celulares: nunca fijos",
    "Nunca a bajas ni a la lista de supresión (el RNE se revisará cuando la CRC publique cómo consultarlo)",
    "Un mensaje en frío por negocio hasta que responda",
    `Máximo ${dailyCap.toLocaleString("es-CO")} al día en todo el negocio`,
    key === "whatsapp_cloud"
      ? "Solo con plantilla de marketing aprobada que tenga botón de baja («No me interesa»)"
      : "Con «Responde NO o BAJA»: esa primera respuesta da de baja sola",
    ...(key === "whatsapp_cloud"
      ? ["Se pausa sola si baja la calidad del número; la reanudas tú"]
      : []),
  ];
}

export const COLD_PAUSE_LABELS: Record<ColdPauseReason, string> = {
  quality_yellow: "la calidad del número bajó a amarilla",
  quality_red: "la calidad del número bajó a roja",
  spam_rate_limit: "Meta frenó el número por posible spam",
  marketing_limit_errors: "Meta rechazó varias plantillas hoy: señal de bloqueos",
};

/** ¿Este canal, así configurado, pone en riesgo un número del tenant? */
/** Nombre del canal de una baja por canal; crudo si no se conoce. */
export function optOutChannelLabel(channel: string): string {
  return OUTREACH_CHANNELS_SHOWN.find((item) => item.key === channel)?.label ?? channel;
}

export function isHighRisk(meta: OutreachChannelMeta, policy: OutreachChannelPolicy): boolean {
  return (
    meta.number_at_stake &&
    policy.enabled &&
    (policy.mode === "any_lead" || policy.mode === "cold_controlled")
  );
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
    if (isColdChannel(opened.key)) {
      return {
        title: `Activaste ${opened.label} en frío controlado`,
        detail: `solo celulares, un mensaje por negocio hasta que responda, máximo ${after.cold.daily_cap[opened.key].toLocaleString("es-CO")} al día; el riesgo queda escrito en cada envío`,
      };
    }
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
  if (JSON.stringify(before.cold) !== JSON.stringify(after.cold)) count += 1;
  if (count === 0) return null;
  return { title: count === 1 ? "Un cambio sin guardar" : `${count} cambios sin guardar` };
}
