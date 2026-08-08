/**
 * SUPERFICIE PÚBLICA del slice `channels` (architecture.md §3.3).
 *
 * Lo que otros slices pueden consumir de canales se declara AQUÍ y solo
 * aquí; un import de `@/modules/channels/...` desde otro slice es una
 * violación de frontera.
 *
 * Consumidores actuales: `modules/scheduling` (selector de canal de los
 * recordatorios — filtrado a canales conectados — y nombre del canal en la
 * tabla).
 */

export {
  CHANNEL_KIND_LABELS,
  CHANNEL_STATUS_LABELS,
  type ChannelDTO,
  type ChannelKind,
  type ChannelStatus,
} from "./domain/channel";

export { listChannels } from "./infrastructure/services/channels-service.adapter";
