"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Mic, Paperclip } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatBytes } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { Button } from "@/shared/components/ui/button";
import {
  ATTACHMENT_CATEGORY_LABELS,
  attachmentCategory,
  attachmentDisplayName,
  isAttachmentMessage,
  type AttachmentCategory,
  type UiMessage,
} from "@/modules/inbox/domain/inbox";
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store";
import { getFreshAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url";
import { AttachmentThumb } from "./AttachmentThumb";
import type { ContextPanelProps } from "../registry";

/**
 * Archivos compartidos en la conversación abierta.
 *
 * El backend NO tiene endpoint de adjuntos, así que el panel se DERIVA del hilo
 * que el store ya tiene cargado: cero peticiones extra y los envíos nuevos
 * aparecen solos (`conversation.message_created` ya inserta en el store).
 * A cambio solo cubre el tramo cargado del hilo — el pie lo dice explícitamente
 * y "Cargar más" reusa la misma paginación por cursor que el chat, así que
 * paginar aquí también enriquece la conversación.
 */

const FILTERS: Array<{ id: AttachmentCategory | "all"; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "image", label: ATTACHMENT_CATEGORY_LABELS.image },
  { id: "video", label: ATTACHMENT_CATEGORY_LABELS.video },
  { id: "audio", label: ATTACHMENT_CATEGORY_LABELS.audio },
  { id: "document", label: ATTACHMENT_CATEGORY_LABELS.document },
];

/** Etiqueta del grupo por día: Hoy / Ayer / "28 jul". */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return date.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function DocumentRow({
  message,
  conversationId,
}: {
  message: UiMessage;
  conversationId: string;
}) {
  const attachment = message.attachments[0];
  const preview = message.local_previews?.[0];
  const isAudio = attachmentCategory(message) === "audio";
  const size = attachment?.size_bytes ?? preview?.size_bytes ?? null;
  const Icon = isAudio ? Mic : FileText;
  // Una nota de voz no tiene nombre útil ("audio-0001.ogg"): se etiqueta por lo
  // que es. El resto pasa por el saneado (WhatsApp manda tokens base64 opacos).
  const title = isAudio
    ? "Nota de voz"
    : attachment !== undefined
      ? attachmentDisplayName(attachment)
      : (preview?.filename ?? "Adjunto");

  return (
    <li className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">
          {size !== null && `${formatBytes(size)} · `}
          {relativeTime(message.created_at)}
        </p>
      </div>
      {attachment !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={`Descargar ${title}`}
          onClick={() => {
            // URL fresca: la cacheada pudo expirar mientras el panel estaba abierto.
            void getFreshAttachmentUrl(conversationId, message.id, attachment.id).then((url) =>
              window.open(url, "_blank", "noopener"),
            );
          }}
        >
          <Download className="size-4" aria-hidden />
        </Button>
      )}
    </li>
  );
}

export function AttachmentsPanel({ conversation }: ContextPanelProps) {
  const conversationId = conversation.id;
  const messagesState = useInboxStore((s) => s.messagesById[conversationId]);
  const fetchOlderMessages = useInboxStore((s) => s.fetchOlderMessages);
  const [filter, setFilter] = useState<AttachmentCategory | "all">("all");
  const [loadingMore, setLoadingMore] = useState(false);

  const items = messagesState?.items;

  /** Adjuntos del hilo, más recientes primero y agrupados por día. */
  const groups = useMemo(() => {
    const matching = (items ?? [])
      .filter(isAttachmentMessage)
      .filter((message) => filter === "all" || attachmentCategory(message) === filter)
      .slice()
      .reverse();

    const byDay = new Map<string, UiMessage[]>();
    for (const message of matching) {
      const key = dayLabel(message.created_at);
      const bucket = byDay.get(key);
      if (bucket === undefined) byDay.set(key, [message]);
      else bucket.push(message);
    }
    return [...byDay.entries()];
  }, [items, filter]);

  const hasMore = messagesState?.next_cursor !== undefined;

  return (
    <>
      <div className="border-b border-border px-4 py-2">
        <div
          className="sidebar-scroll flex gap-1.5 overflow-x-auto pb-1"
          role="group"
          aria-label="Tipo de adjunto"
        >
          {FILTERS.map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary/40 bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Paperclip className="size-10 opacity-30" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "Todavía no se han compartido archivos."
                : `Sin adjuntos de tipo “${FILTERS.find((f) => f.id === filter)?.label}”.`}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([day, messages]) => {
              const visual = messages.filter((message) =>
                ["image", "video"].includes(attachmentCategory(message)),
              );
              const files = messages.filter(
                (message) => !["image", "video"].includes(attachmentCategory(message)),
              );
              return (
                <section key={day} className="space-y-2">
                  <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {day}
                  </h4>
                  {visual.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {visual.map((message) => (
                        <AttachmentThumb
                          key={message.local_id ?? message.id}
                          message={message}
                          conversationId={conversationId}
                        />
                      ))}
                    </div>
                  )}
                  {files.length > 0 && (
                    <ul className="space-y-1">
                      {files.map((message) => (
                        <DocumentRow
                          key={message.local_id ?? message.id}
                          message={message}
                          conversationId={conversationId}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="space-y-2 border-t border-border p-3 text-center">
          {/* Sin este aviso el panel aparentaría cubrir todo el historial. */}
          <p className="text-xs text-muted-foreground">
            Mostrando los adjuntos del tramo cargado del hilo.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full"
            disabled={loadingMore}
            onClick={() => {
              setLoadingMore(true);
              void fetchOlderMessages(conversationId).finally(() => setLoadingMore(false));
            }}
          >
            {loadingMore ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      )}
    </>
  );
}
