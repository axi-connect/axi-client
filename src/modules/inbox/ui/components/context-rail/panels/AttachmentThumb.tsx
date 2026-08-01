"use client";

import { useState } from "react";
import { ImageOff, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  getFreshAttachmentUrl,
  useAttachmentUrl,
} from "@/modules/inbox/infrastructure/hooks/use-attachment-url";
import { MediaLightbox } from "@/modules/inbox/ui/components/media";
import { attachmentDisplayName, type UiMessage } from "@/modules/inbox/domain/inbox";

/**
 * Miniatura cuadrada de imagen/video para la rejilla del panel de adjuntos.
 * Reutiliza la cache de URLs firmadas de las burbujas del chat (TTL 300 s) y el
 * `MediaLightbox` existente; no duplica ni el fetch ni el visor.
 *
 * El optimista recién enviado no tiene attachment todavía: se pinta con su
 * `local_previews[0].object_url` y no abre lightbox (aún no hay id que firmar).
 */
export function AttachmentThumb({
  message,
  conversationId,
}: {
  message: UiMessage;
  conversationId: string;
}) {
  const attachment = message.attachments[0];
  const preview = message.local_previews?.[0];
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { url, status, refresh } = useAttachmentUrl(
    conversationId,
    message.id,
    attachment?.id,
    { enabled: attachment !== undefined },
  );

  const src = url ?? preview?.object_url ?? null;
  const isVideo = message.content_type === "video";
  const label =
    attachment !== undefined
      ? attachmentDisplayName(attachment)
      : (preview?.filename ?? "Adjunto");

  if (src === null) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center rounded-lg bg-muted",
          status === "loading" || message.media_pending === true ? "animate-pulse" : "",
        )}
        role={status === "error" ? undefined : "status"}
        aria-label={status === "error" ? undefined : "Cargando adjunto"}
      >
        {status === "error" && <ImageOff className="size-4 text-muted-foreground" aria-hidden />}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Abrir ${label}`}
        disabled={attachment === undefined}
        onClick={() => {
          if (attachment === undefined) return;
          // El lightbox monta un <img>: el video se abre en pestaña nueva con URL
          // fresca (la del poster pudo expirar) y lo reproduce el navegador.
          if (isVideo) {
            void getFreshAttachmentUrl(conversationId, message.id, attachment.id).then((fresh) =>
              window.open(fresh, "_blank", "noopener"),
            );
            return;
          }
          setLightboxOpen(true);
        }}
        className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default"
      >
        {isVideo ? (
          // El poster del video sale del propio archivo; no hay thumbnail aparte.
          <video
            src={src}
            muted
            preload="metadata"
            className="size-full object-cover"
            aria-label={label}
          />
        ) : (
          // URL firmada rotativa: el optimizador de next/image cachearía por URL
          // y fallaría el hit en cada renovación (mismo criterio que ImageBubble).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
            onError={() => {
              if (attachment !== undefined) refresh();
            }}
          />
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Play className="size-5 text-white drop-shadow" aria-hidden />
          </span>
        )}
      </button>

      {attachment !== undefined && !isVideo && (
        <MediaLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          imageUrl={src}
          attachment={attachment}
          conversationId={conversationId}
          messageId={message.id}
        />
      )}
    </>
  );
}
