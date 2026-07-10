import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice channels — canales de mensajería del tenant
 * (`/channels` + subrecurso `/channels/:id/whatsapp-web/*`).
 * Las credenciales jamás salen por API: solo `credentials_configured`
 * y `token_last4`.
 */
export type ChannelDTO = Schemas["ChannelDto"];
export type CreateChannelDTO = Schemas["CreateChannelDto"];
export type UpdateChannelDTO = Schemas["UpdateChannelDto"];
export type UpdateChannelCredentialsDTO = Schemas["UpdateChannelCredentialsDto"];
export type WwebPairingStateDTO = Schemas["WwebPairingStateDto"];

export type ChannelKind = ChannelDTO["kind"];
export type ChannelStatus = ChannelDTO["status"];

export const CHANNEL_KIND_LABELS: Record<ChannelKind, string> = {
  whatsapp_cloud: "WhatsApp Cloud API",
  whatsapp_web: "WhatsApp Web (QR)",
  instagram_dm: "Instagram DM",
  facebook_messenger: "Facebook Messenger",
};

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  pending_setup: "Pendiente de configurar",
  connecting: "Conectando…",
  connected: "Conectado",
  disconnected: "Desconectado",
  error: "Error",
};

/** Estado efímero de pairing de WhatsApp Web (por WS o polling del snapshot). */
export type WwebPairingState = {
  status: ChannelStatus;
  qr: string | null;
  qr_image: string | null;
  pairing_code: string | null;
  phone_number: string | null;
};
