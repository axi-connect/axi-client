/**
 * Traduce una notificación (`type` + `data`) a su ruta destino en la app.
 * `type` es string libre del backend: los tipos desconocidos (o sin data
 * suficiente) devuelven `null` y el clic solo marca como leída.
 */
type TargetResolver = (data: Record<string, unknown>) => string | null

/** Resolvers por tipo exacto — tienen prioridad sobre la familia. */
const EXACT: Record<string, TargetResolver> = {
  // Cuando exista la vista de pedidos: "order.created": (d) => `/orders/${d.order_id}`
}

/** Resolvers por familia (prefijo `familia.`). */
const FAMILY: Record<string, TargetResolver> = {
  "conversation.": (d) =>
    typeof d.conversation_id === "string" ? `/workspace/inbox/${d.conversation_id}` : null,
  // "order.": sin vista de pedidos hoy → sin destino.
}

export function notificationTarget(type: string, data: unknown): string | null {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
  const exact = EXACT[type]
  if (exact) return exact(d)
  const family = Object.keys(FAMILY).find((prefix) => type.startsWith(prefix))
  return family ? FAMILY[family](d) : null
}
