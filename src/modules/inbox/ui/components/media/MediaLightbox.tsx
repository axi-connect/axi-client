"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { formatBytes } from "@/core/lib/format"
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog"
import { getFreshAttachmentUrl } from "@/modules/inbox/infrastructure/hooks/use-attachment-url"
import { attachmentDisplayName, type MessageAttachment } from "@/modules/inbox/domain/inbox"

/**
 * Visor de imagen a pantalla (casi) completa sobre el Dialog del design
 * system: Esc/overlay cierran, focus trap y scroll lock vienen gratis.
 * La descarga pide una URL firmada FRESCA (la del thumbnail pudo expirar).
 */
export function MediaLightbox({
  open,
  onOpenChange,
  imageUrl,
  attachment,
  conversationId,
  messageId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string | null
  attachment: MessageAttachment
  conversationId: string
  messageId: string
}) {
  const [downloading, setDownloading] = useState(false)
  const displayName = attachmentDisplayName(attachment)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = await getFreshAttachmentUrl(conversationId, messageId, attachment.id)
      window.open(url, "_blank", "noopener")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto max-w-[92vw] gap-2 p-3 sm:max-w-[92vw]">
        <DialogTitle className="sr-only">{displayName}</DialogTitle>
        {imageUrl && (
          // URL firmada rotativa (TTL 300 s): el optimizador de next/image
          // cachearía por URL y fallaría el hit en cada renovación.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={displayName}
            className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
          />
        )}
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          {/* El DialogContent es `w-auto`: su ancho lo dicta el contenido, así
              que un nombre largo (sin oportunidades de corte) estiraría la modal
              hasta 92vw y el `truncate` nunca entraría. El tope en `ch` acota la
              contribución intrínseca del texto al ancho. */}
          <span className="min-w-0 max-w-[min(100%,44ch)] truncate" title={displayName}>
            {displayName} · {formatBytes(attachment.size_bytes)}
          </span>
          <button
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground hover:underline"
          >
            {downloading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="size-3.5" aria-hidden />
            )}
            Descargar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
