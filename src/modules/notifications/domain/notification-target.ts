/**
 * Traduce una notificación (`type` + `data`) a su ruta destino en la app.
 * `type` es string libre del backend: los tipos desconocidos (o sin data
 * suficiente) devuelven `null` y el clic solo marca como leída.
 */
type TargetResolver = (data: Record<string, unknown>) => string | null

/** Resolvers por tipo exacto — tienen prioridad sobre la familia. */
const EXACT: Record<string, TargetResolver> = {
  // F13: alerta de anomalía de analíticas → tab Alertas de la sección.
  "analytics.alert": () => "/analytics?tab=alertas",
}

/** Resolvers por familia (prefijo `familia.`). */
const FAMILY: Record<string, TargetResolver> = {
  "conversation.": (d) =>
    typeof d.conversation_id === "string" ? `/workspace/inbox/${d.conversation_id}` : null,
  // F11: el detalle abre como rail (ruta interceptada) sobre el panel
  "order.": (d) => (typeof d.order_id === "string" ? `/orders/${d.order_id}` : "/orders"),
}

export function notificationTarget(type: string, data: unknown): string | null {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
  const exact = EXACT[type]
  if (exact) return exact(d)
  const family = Object.keys(FAMILY).find((prefix) => type.startsWith(prefix))
  return family ? FAMILY[family](d) : null
}
