import type { FilterSchema } from "@/shared/components/features/filter-panel"
import { localDateToIso } from "@/core/lib/day-label"
import { PRIORITY_LABELS, PRIORITY_ORDER } from "@/modules/inbox/domain/inbox"

/**
 * Esquema BASE de los filtros del inbox: sin opciones dinámicas ni React, para
 * que el store serialice la query sin depender de la UI. Las opciones (canales
 * del tenant, operadores) y el gate de permiso las añade `hydrateInboxFilters`
 * en la capa de UI; la serialización es idéntica con o sin opciones porque
 * `serializeFilters` solo mira `key`/`kind`/`serialize`.
 */
export const INBOX_FILTER_KEYS = {
  channel: "channel_id",
  priority: "priority",
  unread: "unread",
  assignee: "assigned_user_id",
  period: "period",
} as const

/**
 * `date` guarda `[desde, hasta]` como `YYYY-MM-DD` locales; el backend espera
 * `from`/`to` ISO con `to` EXCLUSIVO (`gte`/`lt`), así que «hasta el día 10»
 * viaja como la medianoche del 11.
 */
export function serializePeriod(value: unknown): Record<string, string | undefined> {
  const [after, before] = Array.isArray(value)
    ? [String(value[0] ?? ""), String(value[1] ?? "")]
    : ["", ""]
  return {
    from: after ? localDateToIso(after) : undefined,
    to: before ? localDateToIso(before, { plusDays: 1 }) : undefined,
  }
}

export const INBOX_FILTERS_BASE: FilterSchema = {
  sections: [
    { id: "where", title: "Canal y prioridad" },
    { id: "who", title: "Personas" },
    { id: "when", title: "Actividad" },
  ],
  filters: [
    { kind: "multi", key: INBOX_FILTER_KEYS.channel, section: "where", label: "Canal", options: [] },
    {
      kind: "multi",
      key: INBOX_FILTER_KEYS.priority,
      section: "where",
      label: "Prioridad",
      options: PRIORITY_ORDER.map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] })),
    },
    {
      kind: "switch",
      key: INBOX_FILTER_KEYS.unread,
      section: "who",
      label: "Solo no leídas",
      description: "Conversaciones con mensajes del contacto sin leer.",
    },
    {
      kind: "single",
      key: INBOX_FILTER_KEYS.assignee,
      section: "who",
      label: "Asignada a",
      layout: "select",
      options: [],
    },
    {
      kind: "date",
      key: INBOX_FILTER_KEYS.period,
      section: "when",
      label: "Última actividad",
      mode: "range",
      serialize: serializePeriod,
      description: "Útil en Cerradas: acota por la fecha del último mensaje.",
    },
  ],
}
