/**
 * SUPERFICIE PÚBLICA del slice `channels` (architecture.md §3.3.5).
 *
 * Consumidores actuales:
 * - `modules/marketing`: qué canales `whatsapp_cloud` tiene el tenant para
 *   poblar el selector de plantillas de Meta (las HSM viven en la WABA del
 *   canal, no en el tenant).
 * - `modules/scheduling`: selector de canal de los recordatorios — filtrado a
 *   canales conectados — y nombre del canal en la tabla.
 *
 * Se expone la LECTURA y nada más: conectar, editar o borrar un canal sigue
 * siendo asunto exclusivo de este slice.
 */

export {
  CHANNEL_KIND_LABELS,
  CHANNEL_STATUS_LABELS,
  type ChannelDTO,
  type ChannelKind,
  type ChannelStatus,
} from "./domain/channel";

export { listChannels } from "./infrastructure/services/channels-service.adapter";
