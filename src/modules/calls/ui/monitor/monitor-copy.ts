/**
 * Textos y cifras del Monitoreo (premium F5) con la voz del progreso
 * (DESIGN §7.1): se cuenta lo recorrido y lo que falta, sin porcentajes
 * negativos, y cada cifra dice de dónde sale. TS puro.
 */

/** «18 más que el ciclo anterior» / «el ciclo anterior fueron 230». Sin base, nada. */
export function previousCyclePhrase(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  if (current > previous) return `${current - previous} más que el ciclo anterior`;
  if (current === previous) return "igual que el ciclo anterior";
  return `el ciclo anterior fueron ${previous}`;
}

export type MinutesOutlook = {
  usedMinutes: number;
  limitMinutes: number | null;
  remainingMinutes: number | null;
  /** 0..100, o null sin tope. */
  pct: number | null;
  tone: "success" | "warning" | "destructive" | "neutral";
  /** Lo que va a pasar a este ritmo, o null si aún no hay ritmo. */
  outlook: string | null;
};

const DAY_MS = 86_400_000;

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

/**
 * Minutos del ciclo como recorrido: cuántos van, cuántos quedan y, al ritmo
 * de lo que va del ciclo, si alcanzan hasta el cierre.
 */
export function minutesOutlook(
  minutes: { used_seconds: number; limit_seconds: number | null },
  period: { start: string; end: string },
  now: number,
): MinutesOutlook {
  const usedMinutes = Math.round(minutes.used_seconds / 60);
  if (minutes.limit_seconds === null || minutes.limit_seconds <= 0) {
    return { usedMinutes, limitMinutes: null, remainingMinutes: null, pct: null, tone: "neutral", outlook: null };
  }
  const limitMinutes = Math.round(minutes.limit_seconds / 60);
  const remainingSeconds = Math.max(0, minutes.limit_seconds - minutes.used_seconds);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const pct = Math.min(100, (minutes.used_seconds / minutes.limit_seconds) * 100);
  const tone = pct >= 100 ? "destructive" : pct >= 80 ? "warning" : "success";

  if (pct >= 100) {
    return {
      usedMinutes,
      limitMinutes,
      remainingMinutes: 0,
      pct,
      tone,
      outlook: `Las llamadas están en pausa hasta el ${shortDate(Date.parse(period.end))}. El chat sigue igual.`,
    };
  }
  const start = Date.parse(period.start);
  const end = Date.parse(period.end);
  const elapsedDays = (now - start) / DAY_MS;
  // Con menos de un día de ciclo no hay ritmo que proyectar.
  if (!Number.isFinite(elapsedDays) || elapsedDays < 1 || minutes.used_seconds <= 0) {
    return { usedMinutes, limitMinutes, remainingMinutes, pct, tone, outlook: null };
  }
  const perDay = minutes.used_seconds / elapsedDays;
  const runsOutAt = now + (remainingSeconds / perDay) * DAY_MS;
  const outlook =
    runsOutAt >= end
      ? "A este ritmo te alcanzan para todo el ciclo."
      : `A este ritmo se acaban el ${shortDate(runsOutAt)}; el ciclo cierra el ${shortDate(end)}.`;
  return { usedMinutes, limitMinutes, remainingMinutes, pct, tone, outlook };
}

/** El titular de la isla «Lo próximo»: lo más accionable primero. */
export function nextUpTitle(input: { callbacks: number; failed: number; paused: boolean }): string {
  if (input.callbacks === 1) return "Una persona espera tu llamada";
  if (input.callbacks > 1) return `${input.callbacks} personas esperan tu llamada`;
  if (input.paused) return "Las llamadas están en pausa";
  if (input.failed > 0) return "Revisa lo que no salió";
  return "Todo al día";
}

/** «Andrés, Marta y 1 más». */
export function namesPhrase(names: readonly string[], total: number): string {
  const shown = names.slice(0, 2);
  const rest = total - shown.length;
  if (shown.length === 0) return total === 1 ? "1 contacto" : `${total} contactos`;
  if (rest > 0) return `${shown.join(", ")} y ${rest} más`;
  return shown.length === 2 ? `${shown[0]} y ${shown[1]}` : (shown[0] ?? "");
}
