"use client"

import { cn } from "@/core/lib/utils"
import { CornerDownRight } from "lucide-react"
import { INTERACTIVE_REPLY_LABELS, type InteractiveReply } from "@/modules/inbox/domain/inbox"

/**
 * Chip de la burbuja ENTRANTE: el cliente no escribió ese texto, tocó una
 * opción. La distinción importa para el operador — "Sí" tecleado y "Sí"
 * elegido de dos botones no significan lo mismo cuando hay que auditar una
 * confirmación —, y el caso `numeric` lo explica del todo: el cliente escribió
 * un número contra una lista degradada a texto en WhatsApp Web.
 */
export function InteractiveReplyChip({
  reply,
  outbound,
}: {
  reply: InteractiveReply
  outbound: boolean
}) {
  return (
    <div
      className={cn(
        "mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide",
        outbound ? "text-white/70" : "text-muted-foreground",
      )}
    >
      <CornerDownRight className="size-3 shrink-0" aria-hidden />
      {INTERACTIVE_REPLY_LABELS[reply.source]}
    </div>
  )
}
