/**
 * SUPERFICIE PÚBLICA del slice `channels` (architecture.md §3.3.5).
 *
 * Consumidor actual: `modules/marketing`, que necesita saber qué canales
 * `whatsapp_cloud` tiene el tenant para poblar el selector de plantillas de
 * Meta (las HSM viven en la WABA del canal, no en el tenant).
 *
 * Se expone la LECTURA y nada más: conectar, editar o borrar un canal sigue
 * siendo asunto exclusivo de este slice.
 */

export type { ChannelDTO } from "./domain/channel";
export { listChannels } from "./infrastructure/services/channels-service.adapter";
