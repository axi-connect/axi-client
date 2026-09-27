/**
 * Superficie pública del slice `inbox` (architecture §3.3 regla 5).
 *
 * Consumidores:
 * - `dashboard`: el flujo de conversaciones del Panel lee `/inbox/stats` con el
 *   mismo adaptador que «Tu día» (auditoría IB-1: antes eran dos).
 * - `workspace`: la columna de vistas y canales lee y cambia la vista del store.
 */
export { getInboxStats } from "./infrastructure/services/inbox-service.adapter";
export { useInboxStore } from "./infrastructure/stores/inbox.store";
export {
  INBOX_VIEW_LABELS,
  type InboxCounts,
  type InboxStats,
  type InboxStatsPeriod,
  type InboxView,
} from "./domain/inbox";
