/**
 * Lo que una app conectada (Claude, por MCP) dejó PENDIENTE de confirmar, visto
 * desde /cuenta. TypeScript puro.
 *
 * El contrato es el del asistente (`GET /connected-apps/actions`,
 * `POST /connected-apps/actions/:id/confirm|reject`): los tipos de cable se
 * reutilizan de `cmo/domain/cmo`, que ya los declara para /assistant/actions,
 * en vez de copiarlos.
 */
import type { ActionDecisionDTO, AssistantActionDTO } from "@/modules/cmo/domain/cmo"
import type { AssistantActionView } from "@/shared/components/features/assistant"

export type AppActionDTO = AssistantActionDTO
export type AppActionDecisionDTO = ActionDecisionDTO

export const FORBIDDEN_FALLBACK = "No tienes permiso para hacer este cambio. Pídeselo a quien administra la cuenta."
export const NOT_AVAILABLE = "Esta acción ya no está disponible."

/** El nombre que la tarjeta muestra como origen («Pedido desde Claude»). */
export function appOrigin(label: string | null | undefined): string {
  const name = label?.trim()
  return name === undefined || name === "" ? "una app conectada" : name
}

/**
 * Funde lo que dice el servidor con lo que la pantalla sabe: una decisión EN
 * VUELO manda (repintar el estado viejo haría parpadear la tarjeta), y el
 * `forbidden` de quien la tocó sobrevive (para el servidor sigue pendiente).
 */
export function mergeAppAction(prev: AssistantActionView | undefined, dto: AppActionDTO): AssistantActionView {
  const base = {
    id: dto.id,
    risk: dto.risk,
    summary: dto.preview.summary,
    lines: dto.preview.lines,
    effects: dto.preview.effects,
    expires_at: dto.expires_at,
    origin: appOrigin(dto.origin_label),
  }
  if (prev !== undefined && prev.busy !== null) return { ...prev, ...base }
  if (prev?.phase === "forbidden" && dto.status === "pending") return { ...prev, ...base }
  return { ...base, phase: dto.status, text: dto.outcome_text, busy: null, error: prev?.error ?? null }
}

/** La fase y el texto que deja una decisión. */
export function phaseFromDecision(
  decision: AppActionDecisionDTO,
): Pick<AssistantActionView, "phase" | "text"> {
  switch (decision.outcome) {
    case "executed":
      return { phase: "executed", text: decision.text }
    case "failed":
      return { phase: "failed", text: decision.text }
    case "rejected":
      return { phase: "rejected", text: null }
    case "expired":
      return { phase: "expired", text: null }
    case "forbidden":
      return { phase: "forbidden", text: decision.text ?? FORBIDDEN_FALLBACK }
    case "not_found":
    case "not_pending":
      return { phase: "expired", text: NOT_AVAILABLE }
  }
}

/**
 * Lo que el bloque muestra: las pendientes (las más nuevas primero) y las que se
 * decidieron EN ESTA visita, para que la persona vea el desenlace. El historial
 * viejo no se pinta: «Pendientes de confirmar» no es una bitácora.
 */
export function visibleAppActions(
  actions: readonly AssistantActionView[],
  decidedHere: ReadonlySet<string>,
): AssistantActionView[] {
  return actions.filter((action) => action.phase === "pending" || action.phase === "forbidden" || decidedHere.has(action.id))
}
