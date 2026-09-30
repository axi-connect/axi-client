/**
 * El piloto automático de captación, visto desde el cliente (P5).
 *
 * Espejo del contrato §4.3 que implementa P4 (`autopilot` en el servidor, de
 * axi-dev-01). Los tipos se escriben a mano mientras P4 no está en main: en
 * cuanto su OpenAPI llegue a `schema.d.ts`, se cambian por `Schemas[...]` sin
 * tocar nada más.
 */

export const ROUTINE_MODES = ["assisted", "autonomous"] as const;
export type RoutineMode = (typeof ROUTINE_MODES)[number];

export const RUN_STATUSES = [
  "queued",
  "running",
  "awaiting_approval",
  "paused",
  "done",
  "budget_exhausted",
  "failed",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const RUN_STAGES = [
  "searching",
  "enriching",
  "qualifying",
  "contacting",
  "following",
  "replied",
  "demo",
  "discarded",
] as const;
export type RunStage = (typeof RUN_STAGES)[number];

export type RoutineInput = {
  name: string;
  mode: RoutineMode;
  source: { kind: string; params: Record<string, unknown> };
  qualify: {
    icp_id?: string | null;
    min_score: number;
    require_decision_maker: boolean;
    reveal_email: boolean;
    reveal_phone: boolean;
  };
  contact: { channels: string[]; agent_id: string | null; goal: string };
  follow_up: { sequence_id: string };
  schedule: { days: number[]; times: string[]; timezone: string; leads_per_run: number };
  budget: { per_run: number; per_month: number };
};

export type RunSummary = {
  id: string;
  routine_id: string;
  trigger: string;
  status: RunStatus;
  step: string | null;
  counters: Record<string, number>;
  credits_spent: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type Routine = RoutineInput & {
  id: string;
  status: "active" | "paused" | "archived";
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineListItem = Routine & { last_run: RunSummary | null };

export type RunItem = {
  id: string;
  lead_id: string;
  /** P4 los guarda al calificar (pedido 2026-09-30); opcionales hasta que lleguen. */
  display_name?: string | null;
  company_name?: string | null;
  contact_id: string | null;
  stage: RunStage;
  reason: string | null;
  score: number | null;
  decision: string | null;
  updated_at: string;
};

export type RunDetail = RunSummary & { items: RunItem[] };

export type RunEvent = {
  id: string;
  item_id: string | null;
  kind: string;
  payload: Record<string, unknown>;
  request_id: string | null;
  created_at: string;
};

export type BatchItem = {
  id: string;
  lead_id: string;
  display_name?: string | null;
  company_name?: string | null;
  contact_id: string | null;
  score: number | null;
  decision: string | null;
};

export type Estimate = {
  credits_per_run: number;
  credits_per_month: number;
  runs_per_month: number;
  leads_revealed_per_run: number;
};

/* ─────────────────────────── Cómo se dice ─────────────────────────── */

/** Dónde busca un piloto (`source.kind`, las fuentes de captación de P2). */
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

/** «Dueño, gerente · Restaurantes · Medellín»: lo que el piloto busca, en una línea. */
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
  running: { label: "En ejecución", tone: "info" },
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
  discarded: "Descartado",
};

/**
 * Los pasos del motor, en su orden real (P4 §8). Las esperas no se enseñan
 * como pasos: son parte del paso anterior.
 */
export const RUN_STEPS = [
  { key: "search", label: "Buscar", done_after: ["search", "await_search"] },
  { key: "enrich", label: "Completar datos", done_after: ["enrich", "await_enrich"] },
  { key: "qualify", label: "Calificar y revelar", done_after: ["qualify", "await_reveal"] },
  { key: "promote", label: "Pasar al CRM", done_after: ["promote"] },
  { key: "gate", label: "Revisar la política", done_after: ["gate"] },
  { key: "contact", label: "Inscribir en la secuencia", done_after: ["contact"] },
] as const;

const STEP_ORDER = [
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
  // acabar la búsqueda, no al lanzarla). `approve` —el lote de un piloto
  // asistido— va entre la política e inscribir, y no es un paso propio.
  return RUN_STEPS.filter((entry) => STEP_ORDER.indexOf(entry.done_after.at(-1) ?? "") <= reached).length;
}

/**
 * Por dónde puede contactar el piloto (los `OutreachChannel` de P1), con lo
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
 * Un piloto nuevo, con valores prudentes: asistido (te pide aprobar el lote
 * antes de contactar), correo, de lunes a viernes a las 8:00, 25 cuentas y
 * tope de 40 créditos por ejecución.
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

/** Lo editable de un piloto: lo mismo que se manda al guardar. */
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

/** El embudo de una ejecución desde sus contadores (los del motor de P4). */
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

/** La bitácora dicha en una línea (los eventos que narra el motor de P4). */
export function eventLine(event: RunEvent): string {
  const payload = event.payload;
  if (event.kind === "step_started") {
    const step = typeof payload.step === "string" ? payload.step : "";
    const known = RUN_STEPS.find((entry) => entry.key === step || (entry.done_after as readonly string[]).includes(step));
    return `Empezó: ${known?.label ?? step}`;
  }
  if (event.kind === "run_finished") {
    const status = typeof payload.status === "string" ? payload.status : "";
    const meta = (RUN_STATUS_META as Record<string, { label: string } | undefined>)[status];
    return `Terminó la ejecución · ${meta?.label ?? status}`;
  }
  const detail = typeof payload.detail === "string" ? payload.detail : "";
  return detail === "" ? event.kind : `${event.kind} · ${detail}`;
}

/** Válido para guardar: lo que el servidor rechazaría, dicho antes. */
export function validateRoutine(input: RoutineInput): { field: string; message: string }[] {
  const problems: { field: string; message: string }[] = [];
  if (input.name.trim().length === 0) problems.push({ field: "name", message: "Ponle un nombre al piloto" });
  if (input.contact.channels.length === 0) problems.push({ field: "contact", message: "Elige al menos un canal" });
  if (input.contact.goal.trim().length === 0) problems.push({ field: "contact", message: "Di qué debe lograr la conversación" });
  if (input.follow_up.sequence_id === "") problems.push({ field: "follow_up", message: "Elige la secuencia de seguimiento" });
  if (input.schedule.days.length === 0) problems.push({ field: "schedule", message: "Elige al menos un día" });
  if (input.schedule.times.length === 0) problems.push({ field: "schedule", message: "Elige al menos una hora" });
  if (input.schedule.leads_per_run < 1 || input.schedule.leads_per_run > 200) {
    problems.push({ field: "schedule", message: "Entre 1 y 200 cuentas por ejecución" });
  }
  if (input.budget.per_run > input.budget.per_month && input.budget.per_month > 0) {
    problems.push({ field: "budget", message: "El tope por ejecución no puede pasar del mensual" });
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
