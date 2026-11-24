/**
 * Confirmación según el riesgo: la regla ÚNICA del panel de plataforma
 * (decisión 5 de Cristian, 2026-11-24). Antes estaba al revés: se pedía
 * escribir el número para «Devolver al stock», que se deshace, y no se
 * confirmaba nada al guardar una ruta de IA que afecta a todos.
 *
 * - `reversible`: se hace sin preguntar; queda un aviso y, si se puede,
 *   «Deshacer». Preguntar por lo que se deshace en un clic es ruido.
 * - `important`: importante o de alcance global (todas las empresas, dinero,
 *   una fecha de corte): un diálogo que dice qué va a pasar y un botón con el
 *   verbo. No hace falta escribir nada.
 * - `destructive`: no se deshace o deja a alguien sin servicio (suspender,
 *   liberar un número, purgar): además hay que escribir el nombre exacto.
 *
 * TypeScript puro: la UI (`RiskConfirm`) solo pinta lo que esto decide.
 */
export type RiskLevel = "reversible" | "important" | "destructive";

export type ConfirmationKind = "none" | "dialog" | "typed";

export function confirmationFor(level: RiskLevel): ConfirmationKind {
  if (level === "reversible") return "none";
  if (level === "important") return "dialog";
  return "typed";
}

/**
 * ¿Se puede pulsar el botón final? En `destructive` el texto tiene que ser
 * EXACTO (ni recortado ni sin mayúsculas: lo que se escribe es lo que se
 * borra). Un `destructive` sin texto que escribir es un error de quien llama:
 * nunca se habilita.
 */
export function canConfirm(level: RiskLevel, typed: string, expected: string | undefined): boolean {
  if (confirmationFor(level) !== "typed") return true;
  if (!expected) return false;
  return typed === expected;
}
