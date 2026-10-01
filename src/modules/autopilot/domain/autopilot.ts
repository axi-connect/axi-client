import type { Schemas } from "@/core/api/types";

/**
 * Las rutas de captación (el piloto automático, P5), vistas desde el cliente.
 * En pantalla se dice «ruta» y «salida» (upgrade «Rutas de captación»,
 * 2026-10-01); en el código y en el contrato siguen `routine` y `run`.
 *
 * Los tipos salen del contrato (`Schemas[...]`, el OpenAPI del slice
 * `autopilot` de P4, axi-dev-01): si el servidor cambia una forma, el
 * typecheck rompe aquí. Las listas de valores se quedan como constantes para
 * iterar en la UI, pero `satisfies` las ata al contrato.
 */

export type RoutineInput = Schemas["RoutineInputDto"];
export type Routine = Schemas["RoutineDto"];
export type RoutineListItem = Schemas["RoutinesListDto"]["items"][number];
export type RunSummary = NonNullable<RoutineListItem["last_run"]>;
export type RunDetail = Schemas["AutopilotRunDetailDto"];
export type RunItem = RunDetail["items"][number];
export type RunEvent = Schemas["RunEventsDto"]["items"][number];
export type BatchItem = Schemas["BatchDto"]["items"][number];
export type BatchDecision = Schemas["BatchDecisionDto"];
export type Estimate = Schemas["EstimateDto"];

export type RoutineMode = RoutineInput["mode"];
export type RunStatus = RunSummary["status"];
export type RunStage = RunItem["stage"];

export const ROUTINE_MODES = ["assisted", "autonomous"] as const satisfies readonly RoutineMode[];

export const RUN_STATUSES = [
  "queued",
  "running",
  "awaiting_approval",
  "paused",
  "done",
  "budget_exhausted",
  "failed",
] as const satisfies readonly RunStatus[];

export const RUN_STAGES = [
  "searching",
  "enriching",
  "qualifying",
  "contacting",
  "following",
  "replied",
  "demo",
  "discarded",
] as const satisfies readonly RunStage[];

/* ─────────────────────────── Cómo se dice ─────────────────────────── */

/** Dónde busca una ruta (`source.kind`, las fuentes de captación de P2). */
export const SOURCE_KIND_LABELS: Record<string, { label: string; initial: string }> = {
  apollo_people: { label: "Apollo · personas", initial: "A" },
  rues_open: { label: "RUES abierto", initial: "R" },
  google_places: { label: "Google Maps", initial: "G" },
  openstreetmap: { label: "OpenStreetMap", initial: "O" },
  serp: { label: "Buscador web", initial: "B" },
  meta_lead_ads: { label: "Meta Lead Ads", initial: "M" },
};

export function sourceLabel(kind: string): { label: string; initial: string } {
  return SOURCE_KIND_LABELS[kind] ?? { label: kind, initial: kind.charAt(0).toUpperCase() };
}

/**
 * Las pistas del editor, con la fuente ELEGIDA. Revelar el correo o el celular
 * es de Apollo (personas): con una fuente de negocios se dice que no aplica.
 */
export function sourceHints(kind: string): { search: string; revealEmail: string; revealPhone: string } {
  if (kind === "apollo_people") {
    return {
      search: "Buscar en Apollo no gasta créditos; revelar sí",
      revealEmail: "1 crédito de Apollo, solo si lo encuentra",
      revealPhone: "8 créditos de Apollo, solo si lo encuentra",
    };
  }
  const { label } = sourceLabel(kind);
  return {
    search: `Buscar en ${label} es gratis o va por uso de la fuente`,
    revealEmail: `${label} trae negocios: revelar es para personas de Apollo (1 crédito)`,
    revealPhone: `${label} trae negocios: revelar es para personas de Apollo (8 créditos)`,
  };
}

/** «Dueño, gerente · Restaurantes · Medellín»: lo que la ruta busca, en una línea. */
export function sourceSummary(params: Record<string, unknown>): string {
  const parts: string[] = [];
  const person = params.person as { titles?: unknown } | undefined;
  if (Array.isArray(person?.titles) && person.titles.length > 0) {
    parts.push(person.titles.filter((title): title is string => typeof title === "string").join(", "));
  }
  for (const key of ["category", "text", "city", "zone"]) {
    const value = params[key];
    if (typeof value === "string" && value.trim().length > 0) parts.push(value.trim());
  }
  return parts.length === 0 ? "Sin filtros" : parts.join(" · ");
}

export const RUN_STATUS_META: Record<RunStatus, { label: string; tone: "info" | "success" | "warning" | "neutral" | "destructive" }> = {
  queued: { label: "En cola", tone: "neutral" },
  running: { label: "En ruta", tone: "info" },
  awaiting_approval: { label: "Espera tu aprobación", tone: "warning" },
  paused: { label: "Pausada", tone: "neutral" },
  done: { label: "Terminada", tone: "success" },
  budget_exhausted: { label: "Se acabó el tope", tone: "warning" },
  failed: { label: "Falló", tone: "destructive" },
};

export const RUN_STAGE_LABELS: Record<RunStage, string> = {
  searching: "Buscando",
  enriching: "Completando datos",
  qualifying: "Calificando",
  contacting: "Contactando",
  following: "En seguimiento",
  replied: "Respondió",
  demo: "Demo agendada",
  discarded: "Se quedó en el camino",
};

/**
 * Los pasos del motor, en su orden real (P4 §8). Las esperas no se enseñan
 * como pasos: son parte del paso anterior. `label` es el corto de la parada y
 * `sub` lo que hace, debajo; los de calificar y escribirles dependen de la ruta
 * (qué revela y qué secuencia), y los arma `trajectory.ts`.
 */
export const RUN_STEPS = [
  { key: "search", label: "Buscar", sub: "gratis", done_after: ["search", "await_search"] },
  { key: "enrich", label: "Completar datos", sub: "sitio, teléfono, redes", done_after: ["enrich", "await_enrich"] },
  { key: "qualify", label: "Calificar", sub: "revela el correo", done_after: ["qualify", "await_reveal"] },
  { key: "promote", label: "Pasar al CRM", sub: "contacto + empresa", done_after: ["promote"] },
  { key: "gate", label: "Tu política", sub: "bajas, RNE, horario", done_after: ["gate"] },
  { key: "contact", label: "Escribirles", sub: "tu secuencia", done_after: ["contact"] },
] as const;

/** La parada del lote (solo «Con tu aprobación»): entre tu política y escribirles. */
export const APPROVE_STOP = { key: "approve", label: "Tu aprobación", sub: "revisas el lote" } as const;

/**
 * Antes de escribirles, en una sola redacción para toda la superficie (hoy
 * había cuatro): el nombre del modo y su frase.
 */
export const ROUTINE_MODE_META: Record<RoutineMode, { label: string; hint: string }> = {
  assisted: { label: "Con tu aprobación", hint: "Te muestra el lote y espera tu visto bueno antes de escribirle a nadie." },
  autonomous: { label: "Por su cuenta", hint: "Escribe sin esperar, siempre dentro de tu política y tus topes." },
};

export const STEP_ORDER = [
  "search",
  "await_search",
  "enrich",
  "await_enrich",
  "qualify",
  "await_reveal",
  "promote",
  "gate",
  "approve",
  "contact",
];

/** Cuántos de los seis pasos ya terminaron, según el último paso completado. */
export function stepsDone(step: string | null): number {
  const reached = step === null ? -1 : STEP_ORDER.indexOf(step);
  // Un paso está hecho cuando se alcanzó su ÚLTIMO cierre (buscar termina al
  // acabar la búsqueda, no al lanzarla). `approve` —el lote de una ruta «Con
  // tu aprobación»— va entre la política y escribirles, y no es un paso propio.
  return RUN_STEPS.filter((entry) => STEP_ORDER.indexOf(entry.done_after.at(-1) ?? "") <= reached).length;
}

/**
 * Por dónde puede escribir la ruta (los `OutreachChannel` de P1), con lo
 * que cada uno implica. La política de contacto del tenant manda encima.
 */
export const CONTACT_CHANNEL_OPTIONS: readonly { value: string; label: string; hint: string }[] = [
  { value: "email", label: "Correo", hint: "Desde la dirección de tu negocio en axi, con baja en un clic" },
  { value: "call", label: "Llamada del agente", hint: "Pide por quien decide, en horario hábil" },
  { value: "sms", label: "SMS", hint: "Por tu número de Twilio, si admite SMS" },
  { value: "whatsapp_cloud", label: "WhatsApp", hint: "Plantilla aprobada; sin opt-in solo si tu política lo permite" },
  { value: "manual", label: "Tarea manual", hint: "Instagram, LinkedIn o visita: te deja el texto listo" },
];

/**
 * Una ruta nueva, con valores prudentes: con tu aprobación (te pide aprobar el lote
 * antes de contactar), correo, de lunes a viernes a las 8:00, 25 cuentas y
 * tope de 40 créditos por salida.
 */
export function defaultRoutineInput(timezone: string): RoutineInput {
  return {
    name: "",
    mode: "assisted",
    source: { kind: "apollo_people", params: {} },
    qualify: { min_score: 60, require_decision_maker: true, reveal_email: true, reveal_phone: false },
    contact: { channels: ["email"], agent_id: null, goal: "Agendar una demo con quien decide" },
    follow_up: { sequence_id: "" },
    schedule: { days: [1, 2, 3, 4, 5], times: ["08:00"], timezone, leads_per_run: 25 },
    budget: { per_run: 40, per_month: 600 },
  };
}

/** Lo editable de una ruta: lo mismo que se manda al guardar. */
export function toRoutineInput(routine: Routine): RoutineInput {
  return {
    name: routine.name,
    mode: routine.mode,
    source: routine.source,
    qualify: routine.qualify,
    contact: routine.contact,
    follow_up: routine.follow_up,
    schedule: routine.schedule,
    budget: routine.budget,
  };
}

export const WEEKDAYS: readonly { iso: number; short: string; long: string }[] = [
  { iso: 1, short: "L", long: "lunes" },
  { iso: 2, short: "M", long: "martes" },
  { iso: 3, short: "X", long: "miércoles" },
  { iso: 4, short: "J", long: "jueves" },
  { iso: 5, short: "V", long: "viernes" },
  { iso: 6, short: "S", long: "sábado" },
  { iso: 7, short: "D", long: "domingo" },
];

/** «Lun a vie · 8:00 y 14:00», «Mar y jue · 9:00», «Diario · 7:30». */
export function scheduleLabel(schedule: RoutineInput["schedule"]): string {
  const days = [...schedule.days].sort((a, b) => a - b);
  const times = [...schedule.times].sort().map(hourLabel);
  const timeText = times.length === 0 ? "sin hora" : joinList(times);
  let dayText: string;
  if (days.length === 7) dayText = "Diario";
  else if (days.join(",") === "1,2,3,4,5") dayText = "Lun a vie";
  else if (days.length === 0) dayText = "Sin días";
  else dayText = capitalize(joinList(days.map((iso) => (WEEKDAYS[iso - 1]?.long ?? "").slice(0, 3))));
  return `${dayText} · ${timeText}`;
}

/** «8:00», «14:00»: sin el cero de la izquierda, como se dice. */
export function hourLabel(hhmm: string): string {
  const [hours = "0", minutes = "00"] = hhmm.split(":");
  return `${String(Number(hours))}:${minutes}`;
}

/** El embudo de una salida desde sus contadores (los del motor de P4). */
export function funnelOf(counters: Record<string, number>): { key: string; label: string; value: number }[] {
  return [
    { key: "found", label: "encontró", value: counters.found ?? 0 },
    { key: "qualified", label: "calificó", value: counters.qualified ?? 0 },
    { key: "contacted", label: "contactó", value: counters.contacted ?? 0 },
  ];
}

/** «Carolina Ruiz · La Brasa Parrilla»; «Cuenta sin nombre» si no llegó el nombre. */
export function itemTitle(item: { display_name?: string | null; company_name?: string | null }): string {
  const name = item.display_name?.trim() ?? "";
  const company = item.company_name?.trim() ?? "";
  if (name === "" && company === "") return "Cuenta sin nombre";
  return [name, company].filter((part) => part !== "").join(" · ");
}

/** Válido para guardar: lo que el servidor rechazaría, dicho antes. */
export function validateRoutine(input: RoutineInput): { field: string; message: string }[] {
  const problems: { field: string; message: string }[] = [];
  if (input.name.trim().length === 0) problems.push({ field: "name", message: "Ponle un nombre a la ruta" });
  if (input.contact.channels.length === 0) problems.push({ field: "contact", message: "Elige al menos un canal" });
  if (input.contact.goal.trim().length === 0) problems.push({ field: "contact", message: "Di qué debe lograr la conversación" });
  if (input.follow_up.sequence_id === "") problems.push({ field: "follow_up", message: "Elige la secuencia de seguimiento" });
  if (input.schedule.days.length === 0) problems.push({ field: "schedule", message: "Elige al menos un día" });
  if (input.schedule.times.length === 0) problems.push({ field: "schedule", message: "Elige al menos una hora" });
  if (input.schedule.leads_per_run < 1 || input.schedule.leads_per_run > 200) {
    problems.push({ field: "schedule", message: "Entre 1 y 200 cuentas por salida" });
  }
  if (input.budget.per_run > input.budget.per_month && input.budget.per_month > 0) {
    problems.push({ field: "budget", message: "El tope por salida no puede pasar del mensual" });
  }
  return problems;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} y ${parts.at(-1) ?? ""}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
