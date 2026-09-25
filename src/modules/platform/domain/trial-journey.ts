/**
 * El recorrido de los 7 días de prueba que pinta la ficha del tenant
 * (entrega_premium_plan.md, F1): qué día es hoy, qué hito cae en cada día y
 * cuál es el próximo. TypeScript puro, en la zona del tenant, para probarlo sin
 * React.
 *
 * Los hitos salen de la entrega: el día 0 es la entrega, el 1 el primer
 * resumen de la mañana, las dos citas caen en el día de su fecha (el asesor
 * puede moverlas) y el 7 es el día en que decide.
 */
import { civilDateIn, formatInstantTime } from "@/modules/welcome-kit/domain/formatters";

/** Duración de las dos citas del recorrido (el kit las anuncia así). */
export const CALL_DAY2_MINUTES = 10;
export const CALL_DAY5_MINUTES = 15;

/** Los días del recorrido: del 0 (la entrega) al 7 (decide). */
export const TRIAL_JOURNEY_DAYS = 8;

export type JourneyMilestoneKind = "delivery" | "digest" | "call" | "meeting" | "decide";

export type JourneyMilestone = { kind: JourneyMilestoneKind; label: string };

export type JourneyDayState = "done" | "today" | "upcoming";

export type JourneyDay = {
  index: number;
  state: JourneyDayState;
  milestone: JourneyMilestone | null;
};

export type TrialJourneyInput = {
  startsAt: string;
  endsAt: string;
  timeZone: string;
  callDay2At: string;
  callDay5At: string;
};

export type TrialJourney = {
  days: JourneyDay[];
  /** El día de hoy dentro del recorrido; null antes de empezar o después del día 7. */
  todayIndex: number | null;
  /** Hoy va después del día 7: la prueba terminó. */
  finished: boolean;
};

const DAY_MS = 86_400_000;

function civilMs(iso: string, timeZone: string): number | null {
  const date = civilDateIn(iso, timeZone);
  return date ? Date.UTC(date.year, date.month - 1, date.day) : null;
}

/** Días de calendario, en la zona del tenant, entre el inicio de la prueba y un instante. */
export function journeyDayOf(startsAt: string, iso: string, timeZone: string): number | null {
  const start = civilMs(startsAt, timeZone);
  const at = civilMs(iso, timeZone);
  if (start === null || at === null) return null;
  return Math.round((at - start) / DAY_MS);
}

export function trialJourney(input: TrialJourneyInput, now: Date = new Date()): TrialJourney {
  const { startsAt, timeZone } = input;
  const today = journeyDayOf(startsAt, now.toISOString(), timeZone);
  const milestones = new Map<number, JourneyMilestone>();
  const place = (index: number | null, milestone: JourneyMilestone) => {
    if (index === null || index < 0 || index >= TRIAL_JOURNEY_DAYS || milestones.has(index)) return;
    milestones.set(index, milestone);
  };
  place(0, { kind: "delivery", label: "Entrega" });
  place(journeyDayOf(startsAt, input.callDay2At, timeZone), {
    kind: "call",
    label: `Llamada ${formatInstantTime(input.callDay2At, timeZone)}`,
  });
  place(journeyDayOf(startsAt, input.callDay5At, timeZone), {
    kind: "meeting",
    label: `Reunión ${formatInstantTime(input.callDay5At, timeZone)}`,
  });
  place(TRIAL_JOURNEY_DAYS - 1, { kind: "decide", label: "Decide" });
  place(1, { kind: "digest", label: "1.er resumen" });

  const days: JourneyDay[] = Array.from({ length: TRIAL_JOURNEY_DAYS }, (_, index) => ({
    index,
    state: today === null || index > today ? "upcoming" : index === today ? "today" : "done",
    milestone: milestones.get(index) ?? null,
  }));

  const inRange = today !== null && today >= 0 && today < TRIAL_JOURNEY_DAYS;
  return {
    days,
    todayIndex: inRange ? today : null,
    finished: today !== null && today >= TRIAL_JOURNEY_DAYS,
  };
}

// ------------------------------------------------------------------ el próximo hito

export type NextMilestone = {
  kind: "call" | "meeting" | "decide";
  title: string;
  at: string;
  /** Duración de la cita; null para el cierre de la prueba. */
  minutes: number | null;
};

/** La primera cita (o el cierre de la prueba) que aún no pasó. */
export function nextMilestone(input: TrialJourneyInput, now: Date = new Date()): NextMilestone | null {
  const candidates: NextMilestone[] = [
    { kind: "call", title: "Llamada del día 2", at: input.callDay2At, minutes: CALL_DAY2_MINUTES },
    { kind: "meeting", title: "Reunión del día 5", at: input.callDay5At, minutes: CALL_DAY5_MINUTES },
    { kind: "decide", title: "Termina la prueba", at: input.endsAt, minutes: null },
  ];
  return (
    candidates
      .filter((candidate) => new Date(candidate.at).getTime() > now.getTime())
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0] ?? null
  );
}

/**
 * Cuánto falta, en dos unidades como mucho: «2 d 9 h», «3 h 20 min», «12 min»,
 * «menos de 1 min». Las partes van separadas para pintar la segunda más chica.
 */
export function countdownParts(at: string, now: Date = new Date()): { major: string; minor: string | null } {
  const minutes = Math.floor((new Date(at).getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return { major: "menos de 1 min", minor: null };
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return { major: `${days} d`, minor: hours > 0 ? `${hours} h` : null };
  if (hours > 0) return { major: `${hours} h`, minor: mins > 0 ? `${mins} min` : null };
  return { major: `${mins} min`, minor: null };
}

// ------------------------------------------------------------------ acceso de la dueña

/**
 * Cuánto tardó en crear la contraseña desde que salió su correo: «12 min»,
 * «3 h», «2 d». null si falta alguno de los dos instantes o el orden no cuadra.
 */
export function elapsedLabel(fromIso: string | null, toIso: string | null): { value: string; unit: string } | null {
  if (!fromIso || !toIso) return null;
  const minutes = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes < 60) return { value: String(Math.max(1, minutes)), unit: "min" };
  if (minutes < 48 * 60) return { value: String(Math.round(minutes / 60)), unit: "h" };
  return { value: String(Math.round(minutes / 1440)), unit: "d" };
}
