import {
  APPROVE_STOP,
  CONTACT_CHANNEL_OPTIONS,
  ROUTINE_MODE_META,
  RUN_STATUS_META,
  RUN_STEPS,
  hourLabel,
  scheduleLabel,
  sourceLabel,
  sourceSummary,
  type Estimate,
  type Routine,
  type RoutineInput,
  type RoutineListItem,
  type RunEvent,
  type RunSummary,
} from "./autopilot";
import {
  runTrajectory,
  type StopKey,
  type Trajectory,
  type TrajectoryDestination,
  type TrajectoryExit,
} from "./trajectory";

/**
 * Las frases de las rutas, en un solo sitio y testeadas (como
 * `commercial/domain/copy.ts`). Son las de los mockups «el recorrido» y «Rutas
 * de captación», aprobados el 2026-10-01: «ruta», «salida», «en ruta» y «se
 * quedó en el camino». Cambiarlas aquí es cambiarlas en En vivo, en la lista y
 * en el editor. Ninguna enseña una clave del motor: lo que no se reconoce se
 * dice en general.
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

/** «correo y llamada del agente», para las frases (en minúscula). */
function channelsPhrase(channels: readonly string[]): string {
  return channels.length === 0 ? "los canales de la ruta" : joinList(channelLabels(channels)).toLowerCase();
}

/** Los canales en corto, para los resúmenes del editor: «correo y llamada». */
const CHANNEL_SHORT: Record<string, string> = {
  email: "correo",
  call: "llamada",
  sms: "SMS",
  whatsapp_cloud: "WhatsApp",
  manual: "tarea manual",
};

/** Lo que cuesta revelar por cuenta: 1 crédito el correo y 8 el celular (Apollo). */
export function revealCredits(qualify: Pick<Routine["qualify"], "reveal_email" | "reveal_phone">): number {
  return (qualify.reveal_email ? 1 : 0) + (qualify.reveal_phone ? 8 : 0);
}

function revealPhrase(qualify: Routine["qualify"]): string {
  const credits = revealCredits(qualify);
  if (credits === 0) return "No revela datos: no gasta créditos.";
  const what = qualify.reveal_email && qualify.reveal_phone ? "el correo y el celular" : qualify.reveal_email ? "el correo" : "el celular";
  return `Revelar ${what} cuesta ${plural(credits, "crédito", "créditos")}, solo si lo encuentra.`;
}

function filterPhrase(qualify: Routine["qualify"]): string {
  const score = `puntaje ${String(qualify.min_score)} o más`;
  return qualify.require_decision_maker ? `${score} con decisor identificado` : score;
}

const STOP_LABEL: Record<StopKey, string> = {
  ...Object.fromEntries(RUN_STEPS.map((step) => [step.key, step.label])),
  approve: APPROVE_STOP.label,
} as Record<StopKey, string>;

/** Lo que hace la ruta en cada parada, en gerundio: «En ruta · calificando». */
const STOP_DOING: Record<StopKey, string> = {
  search: "buscando",
  enrich: "completando datos",
  qualify: "calificando",
  promote: "pasando al CRM",
  gate: "revisando tu política",
  approve: "esperando tu aprobación",
  contact: "escribiéndoles",
};

function currentStop(trajectory: Trajectory) {
  return trajectory.stops[Math.max(0, Math.min(trajectory.currentIndex, trajectory.stops.length - 1))];
}

/* ───────────────────────────── La frase de ahora ───────────────────────────── */

/**
 * Por qué se detuvo una salida, en palabras y nunca con `run.error` crudo.
 * Sirve también cuando la ruta no cargó (`routine` null): no nombra la fuente.
 */
export function failureLine(run: Pick<RunSummary, "error" | "step" | "status" | "counters">, routine: RoutineCopy | null): string {
  const again = "No se gastó nada más; puedes salir de nuevo.";
  const error = run.error ?? "";
  if (error.startsWith("search_")) {
    const source = routine === null ? "la fuente" : sourceLabel(routine.source.kind).label;
    return `No se pudo leer la fuente: ${routine === null ? "no respondió" : `${source} no respondió`}. ${again}`;
  }
  if (error === "routine_deleted") return "La ruta se eliminó mientras la salida corría.";
  if (routine === null) return `Algo falló en esta salida. ${again}`;
  const stop = currentStop(runTrajectory(run, routine));
  return `Algo falló en «${stop?.label ?? "la salida"}». ${again}`;
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

/** Qué hace la ruta ahora, en una frase y su detalle (encabezan el mapa). */
export function nowLine(run: RunLike, routine: RoutineCopy, ctx: RunCopyContext = {}): { title: string; detail: string } {
  const trajectory = runTrajectory(run, routine);
  const stop = currentStop(trajectory);
  const c = run.counters;
  switch (run.status) {
    case "queued":
      return { title: "Sale en un momento", detail: "Cuando arranque, verás aquí cada parada con sus cifras." };
    case "paused":
      return {
        title: "Pausaste la ruta",
        detail: `Quedó en «${stop?.label ?? "la salida"}». Sigue donde iba cuando la reanudes.`,
      };
    case "budget_exhausted": {
      if (run.error === "provider_out_of_credits") {
        return {
          title: "Se acabó tu saldo en el proveedor",
          detail: "No queda saldo para revelar quién decide. Recárgalo y sal de nuevo.",
        };
      }
      const qualified = `Terminó con ${plural(c.qualified ?? 0, "cuenta calificada", "cuentas calificadas")}; las que no alcanzó a revelar quedan para la siguiente.`;
      if (run.credits_spent >= routine.budget.per_run) {
        return {
          title: "Se acabó el tope de esta salida",
          detail: `Gastó los ${plural(routine.budget.per_run, "crédito", "créditos")} al revelar quién decide. ${qualified}`,
        };
      }
      // No llegó a su tope por salida: lo que se acabó fue el del mes.
      return {
        title: "Se acabó el tope del mes",
        detail: `Se llegó a los ${plural(routine.budget.per_month, "crédito", "créditos")} del mes. ${qualified}`,
      };
    }
    case "failed":
      return { title: "La salida se detuvo", detail: failureLine(run, routine) };
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
    case "awaiting_approval": {
      const ready = trajectory.stops.find((entry) => entry.key === "approve")?.count ?? c.awaiting ?? 0;
      return {
        title: `${plural(ready, "cuenta lista", "cuentas listas")} para escribirles`,
        detail: `Axi te espera en «${APPROVE_STOP.label}». En cuanto apruebes, sigue a «${STOP_LABEL.contact}».`,
      };
    }
    case "running":
      break;
  }
  const found = c.found ?? 0;
  switch (stop?.key) {
    case "enrich":
      return {
        title: `Completando los datos de ${plural(found, "cuenta", "cuentas")}`,
        detail: "Sitio web, teléfono y redes públicas de cada negocio.",
      };
    case "qualify":
      return {
        title:
          c.qualified === undefined
            ? "Calificando quién encaja"
            : `Calificando: ${String(c.qualified)} de ${String(found)} ${c.qualified === 1 ? "pasa" : "pasan"}, por ahora`,
        detail: `Pasan las de ${filterPhrase(routine.qualify)}. ${revealPhrase(routine.qualify)}`,
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
        title: going === null ? "Escribiéndoles" : `Escribiéndoles a ${plural(going, "cuenta", "cuentas")}`,
        detail: `Por ${channelsPhrase(routine.contact.channels)}, dentro de tu horario.`,
      };
    }
    default:
      return {
        title: `Buscando ${searchWhat(routine.source.params)}`,
        detail: `Trae hasta ${plural(routine.schedule.leads_per_run, "cuenta", "cuentas")} de ${sourceLabel(routine.source.kind).label}. Buscar no gasta créditos.`,
      };
  }
}

/** «restaurantes en Medellín», «gerente, dueño», «cuentas»: lo que se busca, dicho. */
function searchWhat(params: Record<string, unknown>): string {
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim() : "");
  const person = params.person as { titles?: unknown } | undefined;
  const titles = Array.isArray(person?.titles) ? person.titles.filter((title): title is string => typeof title === "string") : [];
  const what = text("category") || text("text") || (titles.length > 0 ? joinList(titles) : "");
  const where = text("city") || text("zone");
  // Solo la primera letra: «restaurantes en Medellín», no «medellín».
  const lower = what === "" ? "cuentas" : what.charAt(0).toLowerCase() + what.slice(1);
  return where === "" ? lower : `${lower} en ${where}`;
}

/* ───────────────────────────── El lote ───────────────────────────── */

export interface BatchCopy {
  /** La píldora: «7 cuentas» · «1 cuenta». */
  pill: string;
  title: string;
  detail: string;
  /** «Aprobar 7 y escribirles»; con cero, «Omitir todas y seguir». */
  cta: string;
  /** «Ninguna se omite» · «1 se omite» · «2 se omiten». */
  skippedNote: string;
}

/** Las frases de la isla «Tu aprobación». */
export function batchCopy(input: {
  total: number;
  approved: number;
  routine: Pick<Routine, "contact">;
  sequenceName?: string | null;
}): BatchCopy {
  const skipped = Math.max(0, input.total - input.approved);
  const sequence = input.sequenceName ? `«${input.sequenceName}»` : "la secuencia de la ruta";
  return {
    pill: plural(input.total, "cuenta", "cuentas"),
    title: "Revisa a quién le escribe",
    detail: `Quita las que no quieras. A las demás les escribe por ${channelsPhrase(input.routine.contact.channels)}, y siguen ${sequence}.`,
    cta: input.approved === 0 ? "Omitir todas y seguir" : `Aprobar ${String(input.approved)} y escribirles`,
    skippedNote: skipped === 0 ? "Ninguna se omite" : `${String(skipped)} ${skipped === 1 ? "se omite" : "se omiten"}`,
  };
}

/* ───────────────────────────── «Lo que viene» ───────────────────────────── */

/** Al final de la ruta: en seguimiento · respondieron · demo agendada. */
export function destinationRows(
  destination: TrajectoryDestination | null,
  agentName?: string | null,
): { rows: { key: keyof TrajectoryDestination; label: string; count: number }[]; empty: string | null } {
  if (destination === null) {
    return { rows: [], empty: `Si responden, ${agentName ? agentName : "el agente"} conversa y te avisa` };
  }
  return {
    rows: [
      { key: "following", label: "en seguimiento", count: destination.following },
      { key: "replied", label: destination.replied === 1 ? "respondió" : "respondieron", count: destination.replied },
      { key: "demo", label: destination.demo === 1 ? "demo agendada" : "demos agendadas", count: destination.demo },
    ],
    empty: null,
  };
}

/* ───────────────────────── La píldora de la tarjeta ───────────────────────── */

type Tone = (typeof RUN_STATUS_META)[keyof typeof RUN_STATUS_META]["tone"];

/**
 * El estado de una ruta en la lista: sale de su ÚLTIMA salida (falló, se acabó
 * el tope, espera…), no de un «Programado» por defecto. En femenino, como
 * «ruta» y «salida»: Pausada, Programada.
 */
export function routineStatusLine(routine: RoutineListItem): { label: string; tone: Tone; live: boolean } {
  const run = routine.last_run;
  if (routine.status === "paused") return { label: "Pausada", tone: "neutral", live: false };
  if (run !== null) {
    if (run.status === "running") {
      const stop = currentStop(runTrajectory(run, routine));
      return { label: `En ruta · ${STOP_DOING[stop?.key ?? "search"]}`, tone: "info", live: true };
    }
    // Una salida pausada con la ruta activa (se reanudó la ruta, la salida no).
    return { label: RUN_STATUS_META[run.status].label, tone: RUN_STATUS_META[run.status].tone, live: false };
  }
  if (routine.status === "active" && routine.next_run_at !== null) return { label: "Programada", tone: "neutral", live: false };
  return { label: "Sin salidas aún", tone: "neutral", live: false };
}

/** «Después: Escribirles»; tras la última parada, «Después: Lo que viene»; `null` al terminar. */
export function nextLine(run: RunLike, routine: Pick<Routine, "mode" | "qualify">): string | null {
  if (run.status === "done" || run.status === "failed" || run.status === "budget_exhausted") return null;
  const trajectory = runTrajectory(run, routine);
  const next = trajectory.stops[trajectory.currentIndex + 1];
  return `Después: ${next === undefined ? "Lo que viene" : next.label}`;
}

/** El título de un desvío del mapa: «16 no pasaron tu filtro», «1 la omitiste». */
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
      return `${String(n)} ${n === 1 ? "se quedó en el camino" : "se quedaron en el camino"}`;
  }
}

/* ───────────────────────────── «Ahora mismo» ───────────────────────────── */

export interface AhoraMismoFact {
  key: "in_flight" | "awaiting" | "next";
  value: string;
  text: string;
}

export interface AhoraMismo {
  /** La frase grande: «7 cuentas esperan tu aprobación», ««Clínicas…» va calificando». */
  headline: string;
  /** La línea de contexto: «Restaurantes de Medellín · además, 1 ruta va calificando · próxima salida hoy a las 14:00». */
  context: string;
  facts: AhoraMismoFact[];
  action: { kind: "batch" | "live"; run_id: string } | null;
}

/** «2026-10-01» en la zona de la ruta: para decir hoy o mañana. */
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

/** «va calificando», «sale en un momento»: lo que hace una ruta en curso. */
function doing(routine: RoutineListItem): string {
  const run = routine.last_run;
  if (run === null || run.status === "queued") return "sale en un momento";
  return `va ${STOP_DOING[currentStop(runTrajectory(run, routine))?.key ?? "search"]}`;
}

/**
 * Lo que pide tu atención en la lista: rutas en ruta, lotes que esperan y la
 * próxima salida. `null` si no hay nada en ruta ni esperando (no se pinta).
 * Sale de la misma lista, sin pedir nada más al servidor.
 */
export function ahoraMismo(routines: readonly RoutineListItem[], now: Date = new Date()): AhoraMismo | null {
  const flying = routines.filter((routine) => routine.last_run?.status === "running" || routine.last_run?.status === "queued");
  const waiting = routines.filter((routine) => routine.last_run?.status === "awaiting_approval");
  if (flying.length === 0 && waiting.length === 0) return null;
  const facts: AhoraMismoFact[] = [];
  const [onlyFlying] = flying;
  if (onlyFlying?.last_run) {
    let text = "en ruta";
    if (flying.length === 1) {
      const run = onlyFlying.last_run;
      const stop = run.status === "queued" ? "en cola" : currentStop(runTrajectory(run, onlyFlying))?.label.toLowerCase();
      text = `en ruta · ${stop ?? ""}`;
    }
    facts.push({ key: "in_flight", value: String(flying.length), text });
  }
  const accounts = waiting.reduce((sum, routine) => sum + (routine.last_run?.counters.awaiting ?? 0), 0);
  if (waiting.length > 0) {
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
  let nextPhrase: string | null = null;
  if (next !== undefined) {
    const timeZone = next.routine.schedule.timezone;
    const time = hourLabel(next.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }));
    const day = departureDay(next.at, now, timeZone);
    facts.push({ key: "next", value: time, text: `próxima salida · ${day}` });
    nextPhrase = `próxima salida ${day} a las ${time}`;
  }
  const batch = waiting[0]?.last_run;
  const live = onlyFlying?.last_run;
  const action = batch ? { kind: "batch" as const, run_id: batch.id } : live ? { kind: "live" as const, run_id: live.id } : null;

  // La frase grande va por lo que pide tu atención: el lote antes que lo que corre.
  let headline: string;
  const context: string[] = [];
  if (waiting.length > 0) {
    headline = `${plural(accounts, "cuenta espera", "cuentas esperan")} tu aprobación`;
    context.push(waiting.length === 1 ? (waiting[0]?.name ?? "") : `en ${plural(waiting.length, "ruta", "rutas")}`);
    if (flying.length === 1 && onlyFlying) context.push(`además, 1 ruta ${doing(onlyFlying)}`);
    else if (flying.length > 1) context.push(`además, ${String(flying.length)} rutas en marcha`);
  } else if (flying.length === 1 && onlyFlying) {
    headline = `«${onlyFlying.name}» ${doing(onlyFlying)}`;
  } else {
    headline = `${String(flying.length)} rutas en marcha`;
  }
  if (nextPhrase !== null) context.push(nextPhrase);
  return { headline, context: context.filter(Boolean).join(" · "), facts, action };
}

/* ───────────────────────── «Así sale tu ruta» ───────────────────────── */

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

/** «revela el correo», «no revela datos»: lo que cuesta calificar, dicho corto. */
function revealShort(qualify: Routine["qualify"]): string {
  const reveal = [qualify.reveal_email ? "el correo" : "", qualify.reveal_phone ? "el celular" : ""].filter(Boolean);
  return reveal.length === 0 ? "no revela datos" : `revela ${joinList(reveal)}`;
}

/** El recorrido del borrador del editor: cada decisión cae en su parada, dicha corta. */
export function previewStops(draft: RoutineInput, ctx: PreviewContext): PreviewStop[] {
  const channels = draft.contact.channels.map((value) => CHANNEL_SHORT[value] ?? "otro canal");
  const stops: PreviewStop[] = [
    { key: "search", label: STOP_LABEL.search, detail: `gratis · ${ctx.sourceLabel}`, gate: false },
    { key: "enrich", label: STOP_LABEL.enrich, detail: "sitio, teléfono y redes", gate: false },
    {
      key: "qualify",
      label: STOP_LABEL.qualify,
      detail: `puntaje ${String(draft.qualify.min_score)}+ · ${revealShort(draft.qualify)}`,
      gate: false,
    },
    { key: "promote", label: STOP_LABEL.promote, detail: "contacto con empresa", gate: false },
    { key: "gate", label: STOP_LABEL.gate, detail: "bajas, RNE, horario", gate: true },
  ];
  if (draft.mode === "assisted") {
    stops.push({ key: "approve", label: STOP_LABEL.approve, detail: "tu visto bueno al lote", gate: true });
  }
  const sequence = ctx.sequenceName === null ? "" : ` · «${ctx.sequenceName}»`;
  stops.push({
    key: "contact",
    label: STOP_LABEL.contact,
    detail: `${channels.length === 0 ? "sin canal" : joinList(channels)}${sequence}`,
    gate: false,
  });
  return stops;
}

/**
 * La frase de la isla «Así sale tu ruta», del estimado del servidor: «De 25
 * negocios, a unos 9 les escribe». Sin estimado o sin nadie revelado, lo que
 * trae.
 */
export function previewHeadline(leadsPerRun: number, estimate: Pick<Estimate, "leads_revealed_per_run"> | null): string {
  const brings = `De ${plural(leadsPerRun, "negocio", "negocios")}`;
  if (estimate === null || estimate.leads_revealed_per_run <= 0) {
    return `Trae hasta ${plural(leadsPerRun, "negocio", "negocios")} por salida`;
  }
  const n = Math.min(estimate.leads_revealed_per_run, leadsPerRun);
  return `${brings}, a ${n === 1 ? "uno" : `unos ${String(n)}`} les escribe`;
}

/** Los resúmenes de los cuatro pasos del editor, cuando están cerrados. */
export function stepSummaries(
  draft: RoutineInput,
  ctx: PreviewContext,
): { where: string; who: string; how: string; when: string } {
  const summary = sourceSummary(draft.source.params);
  const channels = draft.contact.channels.map((value) => CHANNEL_SHORT[value] ?? "otro canal");
  const how = [
    ROUTINE_MODE_META[draft.mode].label,
    channels.length === 0 ? "sin canal" : joinList(channels),
    ...(ctx.agentName === null ? [] : [ctx.agentName]),
    ...(ctx.sequenceName === null ? [] : [`«${ctx.sequenceName}»`]),
  ];
  return {
    where: [ctx.sourceLabel, ...(summary === "Sin filtros" ? [] : [summary])].join(" · "),
    who: [
      `Puntaje ${String(draft.qualify.min_score)} o más`,
      ...(draft.qualify.require_decision_maker ? ["exige quién decide"] : []),
      revealShort(draft.qualify),
    ].join(" · "),
    how: how.join(" · "),
    when: `${scheduleLabel(draft.schedule)} · ${plural(draft.schedule.leads_per_run, "cuenta", "cuentas")} · hasta ${plural(draft.budget.per_run, "crédito", "créditos")} por salida, ${String(draft.budget.per_month)} al mes`,
  };
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
    return meta === undefined ? "Terminó la salida" : `Terminó la salida · ${meta.label}`;
  }
  // Un evento que el motor aún no narraba: se cuenta su detalle, nunca la clave cruda.
  const detail = typeof payload.detail === "string" ? payload.detail : "";
  return detail === "" ? "Novedad de la salida" : detail;
}
