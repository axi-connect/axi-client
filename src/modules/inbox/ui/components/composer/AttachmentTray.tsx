"use client"

import { Check, FileText, Music, RotateCw, X } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { formatBytes } from "@/core/lib/format"
import type { ComposerAttachment } from "@/modules/inbox/domain/inbox"

/**
 * Lo que vas a enviar, dentro de la caja (F3). Foto y video: miniatura de
 * 56 px; documento y audio: ficha con su extensión. La subida no promete
 * porcentaje (el cliente HTTP no lo reporta): anillo indeterminado. Quitar y
 * reintentar son objetivos de 24 px o más.
 */
function Ring({ className }: { className?: string }) {
  return (
    <span
      role="progressbar"
      aria-label="Subiendo"
      className={cn("inline-block animate-spin rounded-full border-2 motion-reduce:animate-none", className)}
    />
  )
}

function extensionOf(name: string): string {
  const ext = name.includes(".") ? name.split(".").pop() : undefined
  return ext && ext.length <= 4 ? ext.toUpperCase() : "ARCH"
}

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
  const visual = attachment.kind === "image" || attachment.kind === "video"
  const state = failed ? "no se subió" : uploading ? "subiendo" : "listo"
  const remove = (
    <button
      type="button"
      onClick={onRemove}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full",
        visual
          ? "absolute top-1 right-1 z-10 bg-black/60 text-white backdrop-blur-sm hover:bg-black/75"
          : "bg-card text-foreground/70 ring-1 ring-border hover:text-foreground",
      )}
      aria-label={`Quitar ${attachment.file_name}`}
    >
      <X className="size-3" strokeWidth={2.6} />
    </button>
  )

  if (visual) {
    return (
      <div
        role="listitem"
        aria-label={`${attachment.file_name}, ${state}`}
        title={failed ? attachment.error_message : attachment.file_name}
        className={cn("relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-muted", failed && "ring-[1.5px] ring-destructive ring-inset")}
      >
        {attachment.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL local
          <img src={attachment.object_url} alt="" className="size-full object-cover" />
        ) : (
          <video src={attachment.object_url} muted className="size-full object-cover" />
        )}
        {uploading && (
          <span className="absolute inset-0 grid place-items-center bg-black/35">
            <Ring className="size-5 border-white/35 border-t-white" />
          </span>
        )}
        {failed && (
          <span className="absolute inset-0 grid place-items-center bg-destructive/55">
            <button
              type="button"
              onClick={onRetry}
              className="grid size-8 place-items-center rounded-full bg-white text-destructive"
              aria-label={`Reintentar la subida de ${attachment.file_name}`}
              title={attachment.error_message ?? "No se subió · Reintentar"}
            >
              <RotateCw className="size-3.5" />
            </button>
          </span>
        )}
        {attachment.status === "uploaded" && (
          <span aria-hidden className="absolute bottom-1 left-1 grid size-[18px] place-items-center rounded-full bg-card text-success">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
        {remove}
      </div>
    )
  }

  return (
    <div
      role="listitem"
      aria-label={`${attachment.file_name}, ${state}`}
      className={cn(
        "flex h-14 w-56 shrink-0 items-center gap-2.5 rounded-[14px] border border-border bg-muted/60 pr-2 pl-2",
        failed && "border-destructive",
      )}
    >
      <span className="relative grid h-10 w-9 shrink-0 place-items-end justify-center rounded-lg bg-card pb-1.5 text-[9.5px] font-bold tracking-wide text-foreground/70 ring-1 ring-border">
        {attachment.kind === "audio" ? <Music className="mb-1 size-4" aria-hidden /> : <FileText className="absolute top-1.5 size-3.5 opacity-50" aria-hidden />}
        {attachment.kind === "audio" ? null : extensionOf(attachment.file_name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-medium">{attachment.file_name}</span>
        <span className={cn("flex items-center gap-1.5 text-[11px] tabular-nums", failed ? "text-destructive" : "text-muted-foreground")}>
          {uploading && <Ring className="size-3 border-foreground/20 border-t-foreground" />}
          {attachment.status === "uploaded" && <Check className="size-3 text-success" strokeWidth={3} aria-hidden />}
          <span className="truncate">
            {formatBytes(attachment.size_bytes)} · {failed ? "no se subió" : uploading ? "subiendo" : "listo"}
          </span>
        </span>
      </span>
      {failed && (
        <button
          type="button"
          onClick={onRetry}
          className="grid size-6 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10"
          aria-label={`Reintentar la subida de ${attachment.file_name}`}
          title={attachment.error_message}
        >
          <RotateCw className="size-3.5" />
        </button>
      )}
      {remove}
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
    <div className="sidebar-scroll flex gap-2 overflow-x-auto px-3 pt-3 pb-1" role="list" aria-label="Adjuntos por enviar">
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
