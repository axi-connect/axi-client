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

function isPdf(mime: string): boolean {
  return mime.includes("pdf")
}

function extensionLabel(filename: string, mime: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined
  if (ext && ext.length <= 5) return ext.toUpperCase()
  return mime.split("/").pop()?.toUpperCase() ?? "ARCHIVO"
}

/** Ficha de documento (F3): la extensión como tapa, nombre truncado, tipo y peso, y descarga de 36 px. */
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
    <div className="flex w-[17rem] max-w-full items-center gap-3 rounded-[14px] bg-current/[0.06] py-2 pr-1.5 pl-2">
      <span
        aria-hidden
        className={cn(
          "relative grid h-10 w-9 shrink-0 place-items-end justify-center rounded-lg pb-1.5 text-[9.5px] font-bold tracking-wide ring-1",
          outbound ? "bg-background text-foreground ring-transparent" : "bg-card text-foreground/75 ring-border",
        )}
      >
        <Icon className="absolute top-1.5 size-3.5 opacity-50" />
        <span className={cn(isPdf(attachment.mime_type) && "text-brand")}>{extensionLabel(displayName, attachment.mime_type)}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium" title={displayName}>
          {displayName}
        </p>
        <p className="text-[11px] tabular-nums opacity-70">
          {extensionLabel(displayName, attachment.mime_type)} · {formatBytes(attachment.size_bytes)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        className="grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Descargar ${displayName}`}
      >
        {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
