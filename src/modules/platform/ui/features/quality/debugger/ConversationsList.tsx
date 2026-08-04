"use client";

/**
 * Conversaciones del contacto elegido (cap 25): estado + modo + preview del
 * último mensaje, con la descarga del diagnóstico como acción principal.
 */
import { Download } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  conversationModeLabel,
  conversationStatusLabel,
  type DebugConversation,
} from "../../../../domain/quality-debug";
import { SimulatedBadge } from "./ContactsList";

type ConversationsListProps = {
  conversations: DebugConversation[];
  onDownload: (conversation: DebugConversation) => void;
};

export function ConversationsList({ conversations, onDownload }: ConversationsListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
      {conversations.map((conversation) => (
        <li key={conversation.id} className="space-y-1.5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="border-border text-muted-foreground">
              {conversationStatusLabel(conversation.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {conversationModeLabel(conversation.mode)}
            </span>
            {conversation.simulated && <SimulatedBadge />}
            <span className="ml-auto text-xs text-muted-foreground">
              {conversation.last_message_at ? <RelativeDate iso={conversation.last_message_at} /> : "sin mensajes"}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {conversation.last_message_preview ?? "—"}
          </p>
          <div className="flex items-center justify-between gap-2">
            {conversation.closed_reason ? (
              <span className="font-mono text-xs text-muted-foreground">{conversation.closed_reason}</span>
            ) : (
              <span />
            )}
            <Button size="sm" variant="outline" onClick={() => onDownload(conversation)}>
              <Download aria-hidden="true" />
              Descargar reporte
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
