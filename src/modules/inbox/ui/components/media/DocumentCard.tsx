"use client"

import { useState } from "react"
import { cn } from "@/core/lib/utils"
import { Download, File, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { formatBytes } from "@/core/lib/format"
import { getFreshAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url"
import { attachmentDisplayName, type MessageAttachment } from "@/modules/inbox/domain/inbox"

function iconForMime(mime: string) {
  if (mime.includes("pdf") || mime.includes("word") || mime.startsWith("text/")) return FileText
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet
  return File
}

function extensionLabel(filename: string, mime: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined
  if (ext && ext.length <= 5) return ext.toUpperCase()
  return mime.split("/").pop()?.toUpperCase() ?? "ARCHIVO"
}

/** Tarjeta de documento: icono por mime + nombre + tamaño + abrir/descargar. */
export function DocumentCard({
  conversationId,
  messageId,
  attachment,
  outbound,
}: {
  conversationId: string
  messageId: string
  attachment: MessageAttachment
  outbound: boolean
}) {
  const [downloading, setDownloading] = useState(false)
  const Icon = iconForMime(attachment.mime_type)
  const displayName = attachmentDisplayName(attachment)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // URL firmada FRESCA en el momento del clic (la mostrada pudo expirar)
      const url = await getFreshAttachmentUrl(conversationId, messageId, attachment.id)
      window.open(url, "_blank", "noopener")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex w-60 max-w-full items-center gap-2.5 rounded-lg px-2.5 py-2",
        outbound ? "bg-white/10" : "bg-background/60",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          outbound ? "bg-white/15 text-white" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-xs font-medium", outbound ? "text-white" : "text-foreground")}>
          {displayName}
        </p>
        <p className={cn("text-[10px]", outbound ? "text-white/70" : "text-muted-foreground")}>
          {extensionLabel(displayName, attachment.mime_type)} ·{" "}
          {formatBytes(attachment.size_bytes)}
        </p>
      </div>
      <button
        onClick={() => void handleDownload()}
        disabled={downloading}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
          outbound ? "text-white hover:bg-white/15" : "text-muted-foreground hover:bg-muted",
        )}
        aria-label={`Descargar ${displayName}`}
      >
        {downloading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
      </button>
    </div>
  )
}
