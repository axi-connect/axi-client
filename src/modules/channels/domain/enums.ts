/**
 * Re-export de enums del canal para consumidores que solo necesitan los
 * literales (evita importar todo el domain).
 */
export type { ChannelKind, ChannelStatus } from "./channel";
export { CHANNEL_KIND_LABELS, CHANNEL_STATUS_LABELS } from "./channel";
