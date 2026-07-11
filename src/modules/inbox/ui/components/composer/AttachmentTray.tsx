"use client"

import { cn } from "@/core/lib/utils"
import { Check, FileText, Loader2, Music, RotateCw, X } from "lucide-react"
import { formatBytes } from "@/core/lib/format"
import type { ComposerAttachment } from "@/modules/inbox/domain/inbox"

/**
 * Franja de adjuntos sobre el textarea (W3): thumbnail para imagen/video,
 * icono para documento/audio; estado de subida por archivo con retry.
 */
function TrayItem({
  attachment,
  onRemove,
  onRetry,
}: {
  attachment: ComposerAttachment
  onRemove: () => void
  onRetry: () => void
}) {
  const uploading = attachment.status === "pending" || attachment.status === "uploading"
  const failed = attachment.status === "error"

  return (
    <div
      className={cn(
        "relative flex w-28 shrink-0 flex-col overflow-hidden rounded-lg border bg-background",
        failed ? "border-destructive" : "border-border",
      )}
    >
      <button
        onClick={onRemove}
        className="absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background"
        aria-label={`Quitar ${attachment.file_name}`}
      >
        <X className="size-3" />
      </button>

      {attachment.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL local
        <img src={attachment.object_url} alt={attachment.file_name} className="h-16 w-full object-cover" />
      ) : attachment.kind === "video" ? (
        <video src={attachment.object_url} muted className="h-16 w-full object-cover" />
      ) : (
        <div className="flex h-16 w-full items-center justify-center bg-muted text-muted-foreground">
          {attachment.kind === "audio" ? <Music className="size-6" /> : <FileText className="size-6" />}
        </div>
      )}

      <div className="flex items-center gap-1 px-1.5 py-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium">{attachment.file_name}</p>
          <p className="text-[9px] text-muted-foreground">{formatBytes(attachment.size_bytes)}</p>
        </div>
        {uploading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-label="Subiendo" />}
        {attachment.status === "uploaded" && <Check className="size-3.5 shrink-0 text-success" aria-label="Listo" />}
        {failed && (
          <button
            onClick={onRetry}
            className="shrink-0 text-destructive"
            aria-label={`Reintentar subida de ${attachment.file_name}`}
          >
            <RotateCw className="size-3.5" />
          </button>
        )}
      </div>
      {uploading && (
        <div className="h-0.5 w-full overflow-hidden bg-muted">
          <div className="h-full w-1/2 animate-pulse bg-brand" />
        </div>
      )}
    </div>
  )
}

export function AttachmentTray({
  attachments,
  onRemove,
  onRetry,
}: {
  attachments: ComposerAttachment[]
  onRemove: (localId: string) => void
  onRetry: (localId: string) => void
}) {
  if (attachments.length === 0) return null
  return (
    <div className="mb-2 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Adjuntos por enviar">
      {attachments.map((attachment) => (
        <TrayItem
          key={attachment.local_id}
          attachment={attachment}
          onRemove={() => onRemove(attachment.local_id)}
          onRetry={() => onRetry(attachment.local_id)}
        />
      ))}
    </div>
  )
}
