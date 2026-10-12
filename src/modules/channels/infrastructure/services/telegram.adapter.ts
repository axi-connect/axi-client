import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type { ChannelDTO } from "@/modules/channels/domain/channel";

export type ConnectTelegramBotDTO = Schemas["ConnectTelegramBotDto"];
export type TelegramQrDTO = Schemas["TelegramQrDto"];

/**
 * Adapter HTTP del canal Telegram.
 *
 * El alta es UNA llamada: el servidor saca el id y el usuario del bot del
 * propio token (`getMe`), registra el webhook y devuelve el canal ya conectado.
 */
export function connectTelegramBot(dto: ConnectTelegramBotDTO): Promise<ChannelDTO> {
  return http.post<ChannelDTO>("/channels/telegram", dto);
}

/** Matriz del QR que abre el chat con el bot (se pinta con los colores del tema). */
export function getTelegramQr(channelId: string): Promise<TelegramQrDTO> {
  return http.get<TelegramQrDTO>(`/channels/${channelId}/telegram/qr`);
}
