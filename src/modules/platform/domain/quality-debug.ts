/**
 * Dominio del depurador forense de conversaciones. Tipos derivados del
 * schema OpenAPI; el directorio incluye entidades `simulated` a propósito
 * (es la herramienta forense de las ejecuciones de calidad).
 */
import type { Schemas } from "@/core/api/types";

export type DebugContact = Schemas["DebugContactsDto"]["data"][number];
export type DebugConversation = Schemas["DebugConversationsDto"]["data"][number];

/** Cap fijo del directorio (contactos y conversaciones): sin paginación. */
export const DEBUG_DIRECTORY_CAP = 25;

/** Etiquetas ES de los estados de conversación conocidos (fallback: crudo). */
export function conversationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: "Abierta",
    pending: "Pendiente",
    closed: "Cerrada",
    snoozed: "Pospuesta",
  };
  return labels[status] ?? status;
}

/** Etiquetas ES del modo de atención (fallback: crudo). */
export function conversationModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    ai_active: "IA activa",
    human_active: "Humano",
    ai_paused: "IA pausada",
  };
  return labels[mode] ?? mode;
}
