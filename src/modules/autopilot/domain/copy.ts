import {
  CONTACT_CHANNEL_OPTIONS,
  RUN_STATUS_META,
  RUN_STEPS,
  hourLabel,
  sourceLabel,
  sourceSummary,
  type Routine,
  type RoutineInput,
  type RoutineListItem,
  type RunEvent,
  type RunSummary,
} from "./autopilot";
import { runTrajectory, type StopKey, type Trajectory, type TrajectoryExit } from "./trajectory";

/**
 * Las frases del recorrido, en un solo sitio y testeadas (como
 * `commercial/domain/copy.ts`). Son las del mockup aprobado el 2026-10-01.
 * Cambiarlas aquí es cambiarlas en En vivo, en la lista y en el editor.
 * Ninguna enseña una clave del motor: lo que no se reconoce se dice en general.
 */

type RunLike = Parameters<typeof runTrajectory>[0] & Pick<RunSummary, "credits_spent" | "error">;
type RoutineCopy = Pick<Routine, "mode" | "qualify" | "source" | "contact" | "schedule" | "budget">;

export interface RunCopyContext {
  sequenceName?: string | null;
  agentName?: string | null;
}

function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} y ${parts.at(-1) ?? ""}`;
}

function channelLabels(channels: readonly string[]): string[] {
  return channels.map((value) => CONTACT_CHANNEL_OPTIONS.find((option) => option.value === value)?.label ?? "otro canal");
}

/** Lo que cuesta revelar por cuenta: 1 crédito el correo y 8 el celular (Apollo). */
export function revealCredits(qualify: Pick<Routine["qualify"], "reveal_email" | "reveal_phone">): number {
  return (qualify.reveal_email ? 1 : 0) + (qualify.reveal_phone ? 8 : 0);
}

function revealPhrase(qualify: Routine["qualify"]): string {
  const credits = revealCredits(qualify);
  if (credits === 0) return "No revela datos: no gasta créditos.";
  const what = qualify.reveal_email && qualify.reveal_phone ? "el correo y el celular" : qualify.reveal_email ? "el correo" : "el celular";
  return `Revelar ${what} cuesta ${plural(credits, "crédito", "créditos")}.`;
}

function filterPhrase(qualify: Routine["qualify"]): string {
  const score = `puntaje ${String(qualify.min_score)} o más`;
  return qualify.require_decision_maker ? `${score} y decisor identificado` : score;
}

const STOP_LABEL: Record<StopKey, string> = {
  ...Object.fromEntries(RUN_STEPS.map((step) => [step.key, step.label])),
  approve: "Tu aprobación",
} as Record<StopKey, string>;

function currentStop(trajectory: Trajectory) {
  return trajectory.stops[Math.max(0, Math.min(trajectory.currentIndex, trajectory.stops.length - 1))];
}

/* ───────────────────────────── La isla «Ahora» ───────────────────────────── */

/** Por qué se detuvo una ejecución, sin la clave del motor. */
function failureDetail(run: RunLike, routine: RoutineCopy, stopLabel: string): string {
  const again = "No se gastó nada más; puedes ejecutarla de nuevo.";
  const error = run.error ?? "";
  if (error.startsWith("search_")) return `No se pudo leer la fuente: ${sourceLabel(routine.source.kind).label} no respondió. ${again}`;
  if (error === "routine_deleted") return "El piloto se eliminó mientras la ejecución corría.";
  return `Algo falló en «${stopLabel}». ${again}`;
}

/** Por qué no se inscribieron, como frase con su cifra (singular y plural). */
const ENROLL_PHRASE: Record<string, (n: number) => string> = {
  enroll_no_channel: (n) => (n === 1 ? "1 no tiene canal para escribirle" : `${String(n)} no tienen canal para escribirles`),
  enroll_opted_out: (n) => (n === 1 ? "1 se dio de baja" : `${String(n)} se dieron de baja`),
  enroll_task_open: (n) =>
    n === 1 ? "1 ya va en una secuencia o tiene una tarea abierta" : `${String(n)} ya van en una secuencia o tienen una tarea abierta`,
  enroll_not_enrolled: (n) => `la secuencia no inscribió a ${String(n)} (¿está activa?)`,
};
const notEnrolledPhrase = (n: number) => (n === 1 ? "1 no se pudo inscribir" : `${String(n)} no se pudieron inscribir`);

/**
 * «7 no tienen canal para escribirles», con el motivo dominante; «7 no se
 * pudieron inscribir» en las ejecuciones viejas, que no traen el motivo.
 * `null` si todo lo que debía entrar se inscribió.
 */
function enrollPhrase(run: RunLike, trajectory: Trajectory): string | null {
  const exit = trajectory.exits.find((entry) => entry.at === "contact");
  const total = exit?.total ?? run.counters.enroll_skipped ?? 0;
  if (total <= 0) return null;
  const [top, ...rest] = exit?.rows ?? [];
  const say = top === undefined ? undefined : ENROLL_PHRASE[top.reason];
  if (top === undefined || say === undefined) return notEnrolledPhrase(total);
  const others = rest.reduce((sum, row) => sum + row.count, 0);
  return others === 0 ? say(top.count) : `${say(top.count)} y ${notEnrolledPhrase(others)} por otros motivos`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Qué hace el piloto ahora, en una frase y su detalle. */
export function nowLine(run: RunLike, routine: RoutineCopy, ctx: RunCopyContext = {}): { title: string; detail: string } {
  const trajectory = runTrajectory(run, routine);
  const stop = currentStop(trajectory);
  const c = run.counters;
  switch (run.status) {
    case "queued":
      return { title: "En cola: está por despegar", detail: "Cuando arranque verás aquí cada paso, con sus cifras." };
    case "paused":
      return {
        title: "Pausaste el piloto",
        detail: `La ejecución quedó en «${stop?.label ?? ""}». Sigue donde iba cuando la reanudes.`,
      };
    case "budget_exhausted": {
      if (run.error === "provider_out_of_credits") {
        return {
          title: "Se acabó tu saldo en el proveedor",
          detail: "No queda saldo para revelar quién decide. Recárgalo y ejecuta el piloto de nuevo.",
        };
      }
      const which =
        run.credits_spent >= routine.budget.per_run
          ? `Gastó los ${plural(routine.budget.per_run, "crédito", "créditos")} de esta ejecución al revelar.`
          : `Se llegó al tope del mes (${plural(routine.budget.per_month, "crédito", "créditos")}).`;
      return {
        title: "Se acabó el tope de esta ejecución",
        detail: `${which} Terminó con ${plural(c.qualified ?? 0, "cuenta calificada", "cuentas calificadas")}; las que no alcanzó a revelar quedan para la siguiente.`,
      };
    }
    case "failed":
      return { title: "La ejecución se detuvo", detail: failureDetail(run, routine, stop?.label ?? "") };
    case "done": {
      const contacted = c.contacted ?? 0;
      const notEnrolled = enrollPhrase(run, trajectory);
      if (contacted > 0) {
        const sequence = ctx.sequenceName ? `la secuencia «${ctx.sequenceName}»` : "la secuencia de seguimiento";
        const agent = ctx.agentName ? ctx.agentName : "el agente";
        const also = notEnrolled === null ? "" : ` Además, ${notEnrolled}.`;
        return {
          title: `Terminada: ${plural(contacted, "cuenta en seguimiento", "cuentas en seguimiento")}`,
          detail: `Siguen ${sequence}. Si alguien responde, ${agent} conversa y te avisa.${also}`,
        };
      }
      // Pasaron la política (y el lote), pero la secuencia no las inscribió: se dice eso.
      if (notEnrolled !== null) {
        return {
          title: "Terminada: no se pudo inscribir a nadie",
          detail: `${capitalize(notEnrolled)}. Revisa que la secuencia esté activa y tenga un canal para estas cuentas.`,
        };
      }
      let detail = "Ninguna pasó tu política de contacto o las omitiste en el lote.";
      if ((c.found ?? 0) === 0) detail = "La fuente no trajo cuentas con este filtro.";
      else if ((c.qualified ?? 0) === 0) detail = `Ninguna cuenta pasó tu filtro: ${filterPhrase(routine.qualify)}.`;
      return { title: "Terminada sin cuentas nuevas", detail };
    }
    case "awaiting_approval":
      return {
        title: "Espera tu aprobación",
        detail:
          "Axi calificó estas cuentas y pasó la política de contacto. Quita las que no quieras y aprueba: las demás se inscriben en la secuencia.",
      };
    case "running":
      break;
  }
  const found = c.found ?? 0;
  switch (stop?.key) {
    case "enrich":
      return {
        title: `Completando datos de ${plural(found, "cuenta", "cuentas")}`,
        detail: "Sitio web, teléfono y redes públicas de cada negocio.",
      };
    case "qualify":
      return {
        title: "Calificando y revelando quién decide",
        detail:
          c.qualified === undefined
            ? `Pasan las de ${filterPhrase(routine.qualify)}. ${revealPhrase(routine.qualify)}`
            : `${String(c.qualified)} de ${String(found)} pasan tu filtro: ${filterPhrase(routine.qualify)}. ${revealPhrase(routine.qualify)}`,
      };
    case "promote":
      return {
        title: `Pasando ${plural(c.qualified ?? 0, "cuenta", "cuentas")} al CRM`,
        detail: "Cada una queda como contacto, con su empresa y quien decide.",
      };
    case "gate":
      return {
        title: "Revisando tu política de contacto",
        detail: "Baja, habeas data, lista de supresión, RNE, horario y tope diario. Lo que no pasa no se contacta.",
      };
    case "approve":
    case "contact": {
      const going = trajectory.stops.find((entry) => entry.key === "approve")?.count ?? trajectory.stops.find((entry) => entry.key === "gate")?.count ?? null;
      return {
        title: going === null ? "Inscribiendo las cuentas en la secuencia" : `Inscribiendo ${plural(going, "cuenta", "cuentas")} en la secuencia`,
        detail: `Por ${joinList(channelLabels(routine.contact.channels)).toLowerCase()}, dentro de tu horario.`,
      };
    }
    default: {
      const summary = sourceSummary(routine.source.params);
      // Solo la primera letra: «restaurantes · Medellín», no «medellín».
      const what = summary === "Sin filtros" ? "cuentas" : summary.charAt(0).toLowerCase() + summary.slice(1);
      return {
        title: `Buscando ${what} en ${sourceLabel(routine.source.kind).label}`,
        detail: `Trae hasta ${plural(routine.schedule.leads_per_run, "cuenta", "cuentas")}. Buscar no gasta créditos.`,
      };
    }
  }
}

/** «Después: Inscribir en la secuencia»; `null` cuando ya no viene nada. */
export function nextLine(run: RunLike, routine: Pick<Routine, "mode" | "qualify">): string | null {
  if (run.status === "done" || run.status === "failed" || run.status === "budget_exhausted") return null;
  const trajectory = runTrajectory(run, routine);
  const next = trajectory.stops[trajectory.currentIndex + 1];
  return next === undefined ? null : `Después: ${next.label}`;
}

/** El título de una salida del mapa: «16 no pasaron tu filtro», «1 la omitiste». */
export function exitTitle(exit: Pick<TrajectoryExit, "at" | "total">): string {
  const n = exit.total;
  switch (exit.at) {
    case "qualify":
      return `${String(n)} ${n === 1 ? "no pasó tu filtro" : "no pasaron tu filtro"}`;
    case "promote":
      return `${String(n)} ${n === 1 ? "no pasó al CRM" : "no pasaron al CRM"}`;
    case "gate":
      return `${String(n)} ${n === 1 ? "frenada por tu política" : "frenadas por tu política"}`;
    case "approve":
      return `${String(n)} ${n === 1 ? "la omitiste" : "las omitiste"}`;
    case "contact":
      return `${String(n)} ${n === 1 ? "no se pudo inscribir" : "no se pudieron inscribir"}`;
    default:
      return `${String(n)} ${n === 1 ? "salió del recorrido" : "salieron del recorrido"}`;
  }
}

/* ───────────────────────────── «Ahora mismo» ───────────────────────────── */

export interface AhoraMismoFact {
  key: "in_flight" | "awaiting" | "next";
  value: string;
  text: string;
}

export interface AhoraMismo {
  facts: AhoraMismoFact[];
  action: { kind: "batch" | "live"; run_id: string } | null;
}

/** «2026-10-01» en la zona del piloto: para decir hoy o mañana. */
function dayKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

function departureDay(at: Date, now: Date, timeZone: string): string {
  const day = dayKey(at, timeZone);
  if (day === dayKey(now, timeZone)) return "hoy";
  if (day === dayKey(new Date(now.getTime() + 24 * 3600_000), timeZone)) return "mañana";
  // Por partes: según la versión de ICU, «es-CO» mete «de» y puntos; aquí siempre «jue 2 oct».
  const parts = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => (parts.find((entry) => entry.type === type)?.value ?? "").replace(".", "");
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

/**
 * Lo que pide tu atención en la lista: pilotos en vuelo, lotes que esperan y
 * la próxima salida. `null` si no hay nada en vuelo ni esperando (no se pinta).
 * Sale de la misma lista, sin pedir nada más al servidor.
 */
export function ahoraMismo(routines: readonly RoutineListItem[], now: Date = new Date()): AhoraMismo | null {
  const flying = routines.filter((routine) => routine.last_run?.status === "running" || routine.last_run?.status === "queued");
  const waiting = routines.filter((routine) => routine.last_run?.status === "awaiting_approval");
  if (flying.length === 0 && waiting.length === 0) return null;
  const facts: AhoraMismoFact[] = [];
  const [onlyFlying] = flying;
  if (onlyFlying?.last_run) {
    let text = "en vuelo";
    if (flying.length === 1) {
      const run = onlyFlying.last_run;
      const stop = run.status === "queued" ? "en cola" : currentStop(runTrajectory(run, onlyFlying))?.label.toLowerCase();
      text = `en vuelo · ${stop ?? ""}`;
    }
    facts.push({ key: "in_flight", value: String(flying.length), text });
  }
  if (waiting.length > 0) {
    const accounts = waiting.reduce((sum, routine) => sum + (routine.last_run?.counters.awaiting ?? 0), 0);
    facts.push({
      key: "awaiting",
      value: String(waiting.length),
      text: `${waiting.length === 1 ? "lote espera tu aprobación" : "lotes esperan tu aprobación"} · ${plural(accounts, "cuenta", "cuentas")}`,
    });
  }
  const next = routines
    .filter((routine) => routine.status === "active" && routine.next_run_at !== null)
    .map((routine) => ({ routine, at: new Date(routine.next_run_at ?? "") }))
    .filter((entry) => !Number.isNaN(entry.at.getTime()) && entry.at.getTime() >= now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  if (next !== undefined) {
    const timeZone = next.routine.schedule.timezone;
    const time = next.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
    facts.push({ key: "next", value: hourLabel(time), text: `próxima salida · ${departureDay(next.at, now, timeZone)}` });
  }
  const batch = waiting[0]?.last_run;
  const live = onlyFlying?.last_run;
  const action = batch ? { kind: "batch" as const, run_id: batch.id } : live ? { kind: "live" as const, run_id: live.id } : null;
  return { facts, action };
}

/* ───────────────────────── «Así vuela tu piloto» ───────────────────────── */

export interface PreviewContext {
  sourceLabel: string;
  sequenceName: string | null;
  agentName: string | null;
  channelLabels: string[];
}

export interface PreviewStop {
  key: StopKey;
  label: string;
  detail: string;
  gate: boolean;
}

/** El recorrido del borrador del editor: cada decisión cae en su parada. */
export function previewStops(draft: RoutineInput, ctx: PreviewContext): PreviewStop[] {
  const summary = sourceSummary(draft.source.params);
  const credits = revealCredits(draft.qualify);
  const reveal = [draft.qualify.reveal_email ? "el correo" : "", draft.qualify.reveal_phone ? "el celular" : ""].filter(Boolean);
  const qualifyParts = [
    `Puntaje ${String(draft.qualify.min_score)} o más`,
    ...(draft.qualify.require_decision_maker ? ["exige quién decide"] : []),
    credits === 0
      ? "no revela datos (no gasta créditos)"
      : `revela ${joinList(reveal)} (${plural(credits, "crédito", "créditos")} por cuenta, solo si lo encuentra)`,
  ];
  const channels = ctx.channelLabels.length === 0 ? "Sin canal" : joinList(ctx.channelLabels);
  const sequence = ctx.sequenceName === null ? "la secuencia que elijas" : `«${ctx.sequenceName}»`;
  const agent = ctx.agentName === null ? "" : ` · si responden, conversa ${ctx.agentName}`;
  const stops: PreviewStop[] = [
    {
      key: "search",
      label: STOP_LABEL.search,
      detail: `${[ctx.sourceLabel, ...(summary === "Sin filtros" ? [] : [summary])].join(" · ")} · ${plural(draft.schedule.leads_per_run, "cuenta", "cuentas")} por ejecución. Buscar no gasta créditos.`,
      gate: false,
    },
    { key: "enrich", label: STOP_LABEL.enrich, detail: "Sitio web, teléfono y redes públicas de cada negocio.", gate: false },
    { key: "qualify", label: STOP_LABEL.qualify, detail: `${qualifyParts.join(" · ")}.`, gate: false },
    { key: "promote", label: STOP_LABEL.promote, detail: "Cada cuenta queda como contacto, con su empresa y quien decide.", gate: false },
    { key: "gate", label: STOP_LABEL.gate, detail: "Baja, habeas data, lista de supresión, RNE, horario y tope diario.", gate: true },
  ];
  if (draft.mode === "assisted") {
    stops.push({ key: "approve", label: STOP_LABEL.approve, detail: "Asistido: te pide aprobar el lote antes de escribirle a nadie.", gate: true });
  }
  stops.push({ key: "contact", label: STOP_LABEL.contact, detail: `${channels} · ${sequence}${agent}.`, gate: false });
  return stops;
}

/* ───────────────────────────── La bitácora ───────────────────────────── */

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stepCompletedLine(step: string, payload: Record<string, unknown>, routine?: Pick<Routine, "source">): string {
  const raw = payload.counters;
  const counters = (raw !== null && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const label = STOP_LABEL[step as StopKey] ?? RUN_STEPS.find((entry) => (entry.done_after as readonly string[]).includes(step))?.label;
  const head = `${label ?? "Un paso"} terminó`;
  const found = num(counters.found) ?? 0;
  switch (step) {
    case "search": {
      const where = routine === undefined ? "" : ` en ${sourceLabel(routine.source.kind).label}`;
      return `${head} · ${plural(found, "cuenta", "cuentas")}${where}`;
    }
    case "enrich":
      return `${head} · ${plural(found, "cuenta", "cuentas")} con su ficha pública`;
    case "qualify": {
      const credits = num(payload.credits_spent) ?? 0;
      const qualified = num(counters.qualified) ?? 0;
      const parts = [`${String(qualified)} ${qualified === 1 ? "pasa" : "pasan"}`, `${String(num(counters.discarded) ?? 0)} no`];
      return `${head} · ${parts.join(", ")} · ${credits === 0 ? "sin gastar créditos" : plural(credits, "crédito", "créditos")}`;
    }
    case "promote": {
      const promoted = num(counters.promoted) ?? num(counters.qualified) ?? 0;
      return `${head} · ${String(promoted)} ${promoted === 1 ? "pasó al CRM" : "pasaron al CRM"}`;
    }
    case "gate": {
      const blocked = num(counters.blocked) ?? 0;
      const promoted = num(counters.promoted);
      const frenadas = `${String(blocked)} ${blocked === 1 ? "frenada" : "frenadas"}`;
      if (promoted === undefined) return `${head} · ${frenadas}`;
      const passing = Math.max(0, promoted - blocked);
      return `${head} · ${String(passing)} ${passing === 1 ? "pasa" : "pasan"}, ${frenadas}`;
    }
    case "contact": {
      const contacted = num(counters.contacted) ?? 0;
      const failed = num(counters.enroll_skipped) ?? 0;
      if (failed === 0) return `${head} · ${String(contacted)} en seguimiento`;
      return `${head} · ${String(contacted)} ${contacted === 1 ? "inscrita" : "inscritas"}, ${String(failed)} ${failed === 1 ? "no se pudo inscribir" : "no se pudieron inscribir"}`;
    }
  }
  return head;
}

/** La bitácora dicha en una línea (los eventos que narra el motor). */
export function eventLine(event: RunEvent, routine?: Pick<Routine, "source">): string {
  const payload = event.payload;
  const step = typeof payload.step === "string" ? payload.step : "";
  if (event.kind === "step_started") {
    const known = RUN_STEPS.find((entry) => entry.key === step || (entry.done_after as readonly string[]).includes(step));
    return `Empezó: ${known?.label ?? "un paso"}`;
  }
  if (event.kind === "step_completed") return stepCompletedLine(step, payload, routine);
  if (event.kind === "run_finished") {
    const status = typeof payload.status === "string" ? payload.status : "";
    const meta = (RUN_STATUS_META as Record<string, { label: string } | undefined>)[status];
    return meta === undefined ? "Terminó la ejecución" : `Terminó la ejecución · ${meta.label}`;
  }
  // Un evento que el motor aún no narraba: se cuenta su detalle, nunca la clave cruda.
  const detail = typeof payload.detail === "string" ? payload.detail : "";
  return detail === "" ? "Novedad de la ejecución" : detail;
}
