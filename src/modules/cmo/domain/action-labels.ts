import type { ActionRisk } from "./cmo";

/**
 * Vocabulario de las acciones preparadas por Axel (F3 «Axel OS») — módulo PURO.
 *
 * Una acción tiene los cinco estados del servidor más `forbidden`, que NO es un
 * estado de la acción (para el servidor sigue pendiente: otra persona con
 * permiso la puede confirmar) sino la respuesta que recibió quien tocó
 * «Confirmar». Por eso vive aquí, en el vocabulario de la pantalla, y no en el
 * contrato.
 */
export type ActionPhase = "pending" | "executed" | "failed" | "rejected" | "expired" | "forbidden";

const PHASE_LABELS: Record<ActionPhase, string> = {
  pending: "Por confirmar",
  executed: "Hecho",
  failed: "No se pudo",
  rejected: "Descartado",
  // «Venció» y no «Expirada», como las propuestas: es lo que diría una persona.
  expired: "Venció",
  forbidden: "Sin permiso",
};

export function actionPhaseLabel(phase: ActionPhase): string {
  return PHASE_LABELS[phase];
}

/**
 * El punto de color del estado (el color va en el punto, nunca en el texto:
 * DESIGN-SYSTEM §2.2 y §10). Clases de token, sin un hex.
 */
export function actionPhaseDot(phase: ActionPhase): string {
  switch (phase) {
    case "executed":
      return "bg-success";
    case "failed":
      return "bg-destructive";
    case "forbidden":
      return "bg-warning";
    case "pending":
      return "bg-foreground";
    default:
      return "bg-muted-foreground";
  }
}

/**
 * La fase que se PINTA: una pendiente cuyo plazo ya pasó se muestra vencida
 * aunque el servidor no lo haya registrado todavía (lo hace al primer toque).
 * Ofrecer «Confirmar» sobre algo que va a responder `expired` sería un botón
 * que no puede funcionar.
 */
export function visiblePhase(
  action: { phase: ActionPhase; expires_at: string | null },
  now: number,
): ActionPhase {
  if (action.phase !== "pending" || action.expires_at === null) return action.phase;
  const at = Date.parse(action.expires_at);
  return Number.isFinite(at) && at <= now ? "expired" : action.phase;
}

/** El verbo del botón principal: R1 se confirma de un toque, R2 se APRUEBA. */
export function confirmVerb(risk: ActionRisk): { idle: string; busy: string } {
  return risk === "external"
    ? { idle: "Aprobar", busy: "Aprobando…" }
    : { idle: "Confirmar", busy: "Confirmando…" };
}

/** «1 cambio», «3 cambios». */
export function changesLabel(count: number): string {
  return count === 1 ? "1 cambio" : `${String(count)} cambios`;
}
