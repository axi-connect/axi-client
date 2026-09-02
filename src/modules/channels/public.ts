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
 * - `modules/onboarding` (F6): el paso «WhatsApp» embebe el wizard de conexión
 *   (`ConnectChannelFlow`) dentro de su propio marco. Es el MISMO flujo que
 *   `/settings/channels/connect`, no una copia: el popup de Meta, el `code` de
 *   30 segundos y el PIN tienen que cambiar en un solo sitio.
 *
 * Fuera de eso se expone la LECTURA y nada más: editar o borrar un canal sigue
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

export { ConnectChannelFlow } from "./ui/components/connect/ConnectChannelFlow";
