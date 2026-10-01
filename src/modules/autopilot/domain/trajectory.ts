import {
  APPROVE_STOP,
  RUN_STEPS,
  STEP_ORDER,
  hourLabel,
  type Routine,
  type RunDetail,
  type RunEvent,
  type RunSummary,
} from "./autopilot";
import { reasonShortLabel, reasonStop } from "./reasons";

/**
 * Una salida contada como aerovía (mockups del recorrido y de captación,
 * aprobados el 2026-10-01): las seis paradas del motor, más «Tu aprobación»
 * entre tu política y escribirles cuando el piloto es «Con tu aprobación». Cada
 * parada lleva cuántas cuentas salieron de ella y a qué hora cerró, y cada
 * cuenta que se quedó en el camino sale por la parada donde se quedó, con su
 * motivo.
 *
 * Todo sale del contrato de hoy: `step`, `status`, `counters`, `credits_spent`
 * y, en la salida en vivo, `items` y la bitácora (`step_completed`). Sin
 * `items` (el `last_run` de la lista) las cifras salen solo de los contadores y
 * los desvíos no traen el desglose.
 */

export type StopKey = (typeof RUN_STEPS)[number]["key"] | "approve";
export type StopState = "done" | "now" | "wait" | "fail" | "todo";

export interface TrajectoryStop {
  key: StopKey;
  label: string;
  /** Cuántas cuentas salieron de la parada; `null` si aún no llega o no se sabe. */
  count: number | null;
  state: StopState;
  /** La política y tu aprobación: las paradas que frenan (el rombo del mapa). */
  gate: boolean;
  /** Lo que hace, debajo del nombre: «gratis», «revela el correo», «"Primer contacto"». */
  sub: string;
  /**
   * La hora a la que cerró («8:06», en la zona del piloto), «ahora» si es la
   * parada en curso de una salida que corre, y `null` si no hay dato (aún no
   * llega, o la bitácora no lo trae: «Tu aprobación» no se narra).
   */
  time: string | null;
}

export interface ExitRow {
  reason: string;
  label: string;
  count: number;
}

export interface TrajectoryExit {
  at: StopKey;
  total: number;
  /** Vacío cuando solo se conoce el total (sin `items`). */
  rows: ExitRow[];
}

/** «Lo que viene», al final del piloto: dónde van las que siguieron. */
export interface TrajectoryDestination {
  following: number;
  replied: number;
  demo: number;
}

export interface Trajectory {
  stops: TrajectoryStop[];
  exits: TrajectoryExit[];
  /** -1 en cola; `stops.length` cuando terminó. */
  currentIndex: number;
  /** El peaje de «Calificar» (lo único que cuesta); `null` si aún no llega ahí. */
  credits: number | null;
  /** `null` sin `items` o si ninguna llegó todavía a «Lo que viene». */
  destination: TrajectoryDestination | null;
}

type RunLike = Pick<RunSummary, "status" | "step" | "counters"> & {
  credits_spent?: number;
  items?: readonly Pick<RunDetail["items"][number], "stage" | "reason" | "decision">[];
};

type RoutineShape = Pick<Routine, "mode" | "qualify"> & { schedule?: Pick<Routine["schedule"], "timezone"> };

export interface TrajectoryContext {
  /** El nombre de la secuencia, para el `sub` de «Escribirles». */
  sequenceName?: string | null;
  /** La bitácora de la salida: de aquí salen las horas de cada parada. */
  events?: readonly Pick<RunEvent, "kind" | "payload" | "created_at">[];
}

/** El paso del motor que cierra cada parada (las esperas son parte del paso anterior). */
const CLOSES: Record<StopKey, string> = {
  search: "await_search",
  enrich: "await_enrich",
  qualify: "await_reveal",
  promote: "promote",
  gate: "gate",
  approve: "approve",
  contact: "contact",
};

/** Qué revela «Calificar», dicho corto. */
function qualifySub(qualify: Routine["qualify"]): string {
  if (qualify.reveal_email && qualify.reveal_phone) return "revela correo y celular";
  if (qualify.reveal_email) return "revela el correo";
  if (qualify.reveal_phone) return "revela el celular";
  return "no revela datos";
}

type StopShape = Pick<TrajectoryStop, "key" | "label" | "gate" | "sub">;

function stopsOf(routine: RoutineShape, ctx: TrajectoryContext): StopShape[] {
  const stops: StopShape[] = RUN_STEPS.map((step) => {
    let sub: string = step.sub;
    if (step.key === "qualify") sub = qualifySub(routine.qualify);
    if (step.key === "contact" && ctx.sequenceName) sub = `«${ctx.sequenceName}»`;
    return { key: step.key, label: step.label, gate: step.key === "gate", sub };
  });
  if (routine.mode === "assisted") {
    const contact = stops.findIndex((stop) => stop.key === "contact");
    stops.splice(contact, 0, { key: APPROVE_STOP.key, label: APPROVE_STOP.label, gate: true, sub: APPROVE_STOP.sub });
  }
  return stops;
}

/** «8:06» en la zona del piloto (o la del navegador si no se conoce). */
function clock(iso: string, timeZone: string | undefined): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const hhmm = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timeZone === undefined ? {} : { timeZone }),
  });
  return hourLabel(hhmm);
}

/** La hora del primer `step_completed` de cada parada (la clave va en `payload.step`). */
function closedAt(events: TrajectoryContext["events"], timeZone: string | undefined): Map<string, string> {
  const times = new Map<string, string>();
  for (const event of events ?? []) {
    if (event.kind !== "step_completed") continue;
    const step = typeof event.payload.step === "string" ? event.payload.step : "";
    if (step === "" || times.has(step)) continue;
    const time = clock(event.created_at, timeZone);
    if (time !== null) times.set(step, time);
  }
  return times;
}

function currentIndexOf(run: RunLike, keys: StopKey[]): number {
  if (run.status === "queued") return -1;
  if (run.status === "done") return keys.length;
  const approve = keys.indexOf("approve");
  if (run.status === "awaiting_approval" && approve >= 0) return approve;
  // Pausada con el lote sin decidir: sigue en tu aprobación, no en inscribir.
  if (
    approve >= 0 &&
    run.step === "approve" &&
    run.status !== "running" &&
    run.items?.some((item) => item.stage === "contacting" && item.decision === null) === true
  ) {
    return approve;
  }
  const reached = run.step === null ? -1 : STEP_ORDER.indexOf(run.step);
  const done = keys.filter((key) => STEP_ORDER.indexOf(CLOSES[key]) <= reached).length;
  // Una ejecución viva siempre está EN una parada, aunque ya cerrara la última.
  return Math.min(done, keys.length - 1);
}

function stateAt(index: number, current: number, status: RunLike["status"]): StopState {
  if (status === "done" || index < current) return "done";
  if (index > current) return "todo";
  if (status === "failed") return "fail";
  if (status === "awaiting_approval") return "wait";
  return "now";
}

/** Las descartadas, por la parada donde se quedaron y por motivo. */
function exitsOf(run: RunLike, keys: StopKey[], current: number, routine: Pick<Routine, "qualify">): TrajectoryExit[] {
  const counters = run.counters;
  if (run.items === undefined) {
    const totals: [StopKey, number | undefined][] = [
      ["qualify", counters.discarded],
      ["gate", counters.blocked],
      ["approve", counters.batch_skipped],
      ["contact", counters.enroll_skipped],
    ];
    return totals.flatMap(([at, total]) =>
      total === undefined || total <= 0 || !keys.includes(at) ? [] : [{ at, total, rows: [] }],
    );
  }
  const fallback = keys[Math.max(0, Math.min(current, keys.length - 1))] ?? "search";
  const groups = new Map<StopKey, Map<string, number>>();
  for (const item of run.items) {
    if (item.stage !== "discarded") continue;
    let at: StopKey = reasonStop(item.reason) ?? fallback;
    if (!keys.includes(at)) at = at === "approve" ? "contact" : fallback;
    const reasons = groups.get(at) ?? new Map<string, number>();
    const reason = item.reason ?? "";
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    groups.set(at, reasons);
  }
  // Las ejecuciones de antes del motivo `enroll_*` dejaban en seguimiento a lo
  // que la secuencia no inscribió: solo se sabe el total, por el contador.
  const enrollSkipped = counters.enroll_skipped ?? 0;
  const legacyEnroll = !groups.has("contact") && enrollSkipped > 0;
  return keys.flatMap((at): TrajectoryExit[] => {
    if (at === "contact" && legacyEnroll) return [{ at, total: enrollSkipped, rows: [] }];
    const reasons = groups.get(at);
    if (reasons === undefined) return [];
    const rows = [...reasons.entries()]
      .map(([reason, count]) => ({ reason, label: reasonShortLabel(reason, routine), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
    return [{ at, total: rows.reduce((sum, row) => sum + row.count, 0), rows }];
  });
}

/** Cuántas cuentas salieron de cada parada, con lo que se sabe hasta ahora. */
function outputsOf(run: RunLike, exits: TrajectoryExit[]): Record<StopKey, number | undefined> {
  const c = run.counters;
  const promoteExits = exits.find((exit) => exit.at === "promote")?.total ?? 0;
  // Las ejecuciones de antes del contador `promoted`: lo que pasó a la política
  // (frenadas + las que siguieron) o, si aún no llega ahí, las calificadas sin
  // las que no pasaron al CRM.
  let promoted = c.promoted;
  if (promoted === undefined && c.blocked !== undefined) {
    const passing = c.awaiting ?? (c.contacted === undefined ? undefined : c.contacted + (c.enroll_skipped ?? 0) + (c.batch_skipped ?? 0));
    if (passing !== undefined) promoted = passing + c.blocked;
  }
  if (promoted === undefined && c.qualified !== undefined && STEP_ORDER.indexOf(run.step ?? "") >= STEP_ORDER.indexOf("promote")) {
    promoted = c.qualified - promoteExits;
  }
  let approved: number | undefined;
  if (c.awaiting !== undefined) {
    const decided = run.items?.filter((item) => item.decision !== null) ?? [];
    if (c.batch_skipped !== undefined) approved = c.awaiting - c.batch_skipped;
    else if (decided.length > 0) approved = decided.filter((item) => item.decision === "approved").length;
    else approved = c.awaiting;
  }
  return {
    search: c.found,
    enrich: STEP_ORDER.indexOf(run.step ?? "") >= STEP_ORDER.indexOf("await_search") ? c.found : undefined,
    qualify: c.qualified,
    promote: promoted,
    gate: c.blocked === undefined || promoted === undefined ? undefined : Math.max(0, promoted - c.blocked),
    approve: approved,
    contact: c.contacted,
  };
}

function destinationOf(run: RunLike): TrajectoryDestination | null {
  if (run.items === undefined) return null;
  const destination = { following: 0, replied: 0, demo: 0 };
  for (const item of run.items) {
    if (item.stage === "following" || item.stage === "replied" || item.stage === "demo") destination[item.stage] += 1;
  }
  return destination.following + destination.replied + destination.demo === 0 ? null : destination;
}

export function runTrajectory(run: RunLike, routine: RoutineShape, ctx: TrajectoryContext = {}): Trajectory {
  const shape = stopsOf(routine, ctx);
  const keys = shape.map((stop) => stop.key);
  const currentIndex = currentIndexOf(run, keys);
  const exits = exitsOf(run, keys, currentIndex, routine);
  const outputs = outputsOf(run, exits);
  const times = closedAt(ctx.events, routine.schedule?.timezone);
  const stops = shape.map((stop, index) => {
    const state = stateAt(index, currentIndex, run.status);
    const output = outputs[stop.key];
    // Terminada: lo que no llegó a una parada es un cero, no un «aún no».
    const count = state === "todo" ? null : (output ?? (run.status === "done" ? 0 : null));
    const live = state === "now" && run.status === "running";
    const time = state === "todo" ? null : live ? "ahora" : (times.get(stop.key) ?? null);
    return { ...stop, state, count, time };
  });
  const qualify = stops.find((stop) => stop.key === "qualify");
  const credits = qualify === undefined || qualify.state === "todo" ? null : (run.credits_spent ?? null);
  return { stops, exits, currentIndex, credits, destination: destinationOf(run) };
}

