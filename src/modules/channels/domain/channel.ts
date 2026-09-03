import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice channels — canales de mensajería del tenant (`/channels`).
 * Las credenciales jamás salen por API: solo `credentials_configured`
 * y `token_last4`.
 */
export type ChannelDTO = Schemas["ChannelDto"];
export type CreateChannelDTO = Schemas["CreateChannelDto"];
export type UpdateChannelDTO = Schemas["UpdateChannelDto"];
export type UpdateChannelCredentialsDTO = Schemas["UpdateChannelCredentialsDto"];

export type ChannelKind = ChannelDTO["kind"];
export type ChannelStatus = ChannelDTO["status"];

export const CHANNEL_KIND_LABELS: Record<ChannelKind, string> = {
  whatsapp_cloud: "WhatsApp Cloud API",
  // Retirado: el cliente no oficial se archivó (`archive/whatsapp-web`). El kind
  // sigue en el enum del backend como valor histórico sin filas vivas.
  whatsapp_web: "WhatsApp Web (retirado)",
  instagram_dm: "Instagram DM",
  facebook_messenger: "Facebook Messenger",
  // Canal sintético del módulo quality (QA simulado): no se crea desde la UI
  simulator: "Simulador (QA)",
};

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  pending_setup: "Pendiente de configurar",
  connecting: "Conectando…",
  connected: "Conectado",
  disconnected: "Desconectado",
  error: "Error",
};

