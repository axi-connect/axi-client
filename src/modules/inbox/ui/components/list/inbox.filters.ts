import type { ChannelDTO } from "@/modules/channels/public"
import { ChannelKindIcon } from "@/modules/channels/public"
import type { AssignableUser } from "@/modules/crm/public"
import type { FilterDef, FilterOption, FilterSchema } from "@/shared/components/features/filter-panel"
import { INBOX_FILTER_KEYS } from "@/modules/inbox/infrastructure/stores/inbox-filters.base"

export { INBOX_FILTER_KEYS, INBOX_FILTERS_BASE } from "@/modules/inbox/infrastructure/stores/inbox-filters.base"

/**
 * Completa el esquema base con lo que solo la UI conoce: los canales del
 * tenant (con su logo), los operadores y el permiso para filtrar por otro
 * operador. El store nunca ve este esquema: serializa con el base, que tiene
 * las mismas claves.
 */
export function hydrateInboxFilters(
  base: FilterSchema,
  input: {
    channels: readonly ChannelDTO[]
    users: readonly AssignableUser[]
    /** `conversations:manage`: sin él, el filtro «Asignada a» no existe. */
    canFilterAssignee: boolean
  },
): FilterSchema {
  const channelOptions: FilterOption[] = input.channels.map((channel) => ({
    value: channel.id,
    label: channel.name,
    icon: channelIconFor(channel.kind),
  }))
  const userOptions: FilterOption[] = input.users.map((user) => ({ value: user.id, label: user.name }))

  const filters: FilterDef[] = []
  for (const def of base.filters) {
    if (def.key === INBOX_FILTER_KEYS.channel && def.kind === "multi") {
      filters.push({ ...def, options: channelOptions })
    } else if (def.key === INBOX_FILTER_KEYS.assignee && def.kind === "single") {
      if (input.canFilterAssignee) filters.push({ ...def, options: userOptions })
    } else {
      filters.push(def)
    }
  }
  return { ...base, filters }
}

/** Un componente por `kind`, memoizado: `FilterOption.icon` espera un tipo, no un elemento. */
const ICON_BY_KIND = new Map<ChannelDTO["kind"], React.ComponentType<{ className?: string }>>()

function channelIconFor(kind: ChannelDTO["kind"]): React.ComponentType<{ className?: string }> {
  let icon = ICON_BY_KIND.get(kind)
  if (icon === undefined) {
    icon = function ChannelFilterIcon({ className }: { className?: string }) {
      return ChannelKindIcon({ kind, className })
    }
    ICON_BY_KIND.set(kind, icon)
  }
  return icon
}
