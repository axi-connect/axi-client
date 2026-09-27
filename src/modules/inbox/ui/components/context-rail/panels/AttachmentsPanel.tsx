"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Mic } from "lucide-react";
import { formatDayLabel } from "@/core/lib/day-label";
import { formatBytes } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
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
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import { AttachmentThumb } from "./AttachmentThumb";
import type { ContextPanelHeading, ContextPanelProps } from "../registry";

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

type Filter = AttachmentCategory | "all";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todo" },
  { value: "image", label: ATTACHMENT_CATEGORY_LABELS.image },
  { value: "video", label: ATTACHMENT_CATEGORY_LABELS.video },
  { value: "audio", label: ATTACHMENT_CATEGORY_LABELS.audio },
  { value: "document", label: ATTACHMENT_CATEGORY_LABELS.document },
];

/** Cuántos adjuntos hay en el tramo YA cargado del hilo (sin pedir nada). */
function useLoadedAttachmentCount(conversationId: string): number {
  return useInboxStore((s) => (s.messagesById[conversationId]?.items ?? []).filter(isAttachmentMessage).length);
}

/** Conteo del icono del riel (F4): solo lo que el hilo ya tiene en memoria. */
export function useAttachmentsCount({ conversation }: Pick<ContextPanelProps, "conversation">): number | null {
  return useLoadedAttachmentCount(conversation.id);
}

export function useAttachmentsHeading({ conversation }: ContextPanelProps): ContextPanelHeading {
  const count = useLoadedAttachmentCount(conversation.id);
  return {
    title: count === 0 ? "Sin archivos" : count === 1 ? "1 archivo" : `${String(count)} archivos`,
    subtitle: "En lo que llevas cargado de la conversación",
  };
}

/** Etiqueta del grupo por día (helper compartido con la lista y el hilo). */
function dayLabel(iso: string): string {
  return formatDayLabel(iso, Date.now(), "short");
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
    <li className="flex min-w-0 items-center gap-3 rounded-xl p-2 hover:bg-muted">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/75 ring-1 ring-border">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={title}>{title}</p>
        <p className="text-xs text-muted-foreground">
          {size !== null && `${formatBytes(size)} · `}
          {relativeTime(message.created_at)}
        </p>
      </div>
      {attachment !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full hover:bg-background"
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
  const [filter, setFilter] = useState<Filter>("all");
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
      <div className="shrink-0 border-b border-border px-3.5 py-2.5">
        {/* Filtro, no pestañas: un radiogroup (sin panel). El activo se ELEVA, sin coral. */}
        <SegmentedControl<Filter>
          label="Tipo de adjunto"
          size="sm"
          treatment="lift"
          value={filter}
          onValueChange={setFilter}
          items={FILTERS}
          className="w-full [&>button]:flex-1 [&>button]:px-1.5"
        />
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <GlassGlyph kind={filter === "all" ? "conversation" : "noresults"} tier="sm" />
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "Todavía no se han compartido archivos."
                : `Sin adjuntos de tipo «${FILTERS.find((f) => f.value === filter)?.label ?? ""}».`}
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
            Solo lo que ya se cargó del hilo. Más atrás puede haber otros.
          </p>
          <Button
            variant="outline"
            className="h-9 w-full rounded-full"
            disabled={loadingMore}
            onClick={() => {
              setLoadingMore(true);
              void fetchOlderMessages(conversationId).finally(() => setLoadingMore(false));
            }}
          >
            {loadingMore ? "Cargando…" : "Cargar más de la conversación"}
          </Button>
        </div>
      )}
    </>
  );
}
