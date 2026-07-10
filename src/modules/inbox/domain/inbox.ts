import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice inbox — bandeja operable de conversaciones
 * (`/inbox/*` + `/conversations/*`) con handoff humano ⇄ IA.
 */
export type ConversationDTO = Schemas["ConversationDto"];
export type InboxConversation = Schemas["InboxListDto"]["data"][number];
export type InboxCounts = Schemas["InboxCountsDto"];
export type Message = Schemas["ConversationMessagesDto"]["data"][number];
export type EnqueuedMessage = Schemas["EnqueuedMessageDto"];
export type ConversationEvent = Schemas["ConversationEventsDto"]["data"][number];
export type SendMessageDTO = Schemas["SendMessageDto"];

export type ConversationStatus = ConversationDTO["status"];
export type ConversationMode = ConversationDTO["mode"];
export type MessageStatus = Message["status"];

/** Tabs de la bandeja: espejo de los contadores de `GET /inbox/counts`. */
export type InboxTab = "queued" | "mine" | "ai" | "all_open";

export const INBOX_TAB_LABELS: Record<InboxTab, string> = {
  queued: "En cola",
  mine: "Mías",
  ai: "IA",
  all_open: "Abiertas",
};

export const MODE_LABELS: Record<ConversationMode, string> = {
  ai_active: "IA",
  human_queued: "En cola",
  human_active: "Humano",
};

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Abierta",
  snoozed: "Pospuesta",
  resolved: "Resuelta",
  closed: "Cerrada",
};

/**
 * Mensaje de la UI: un `Message` del backend o un optimista local aún sin
 * confirmar (`pending` hasta el ack / evento `conversation.message_sent`).
 */
export type UiMessage = Message & {
  /** Solo mensajes optimistas: id temporal local hasta reconciliar. */
  local_id?: string;
  delivery?: "pending" | "confirmed" | "failed";
};

/** Filtros que la UI traduce a query params de `GET /inbox/conversations`. */
export function tabToQuery(tab: InboxTab): Record<string, string> {
  switch (tab) {
    case "queued":
      return { mode: "human_queued", status: "open" };
    case "mine":
      return { assigned: "me", status: "open" };
    case "ai":
      return { mode: "ai_active", status: "open" };
    case "all_open":
      return { status: "open" };
  }
}
