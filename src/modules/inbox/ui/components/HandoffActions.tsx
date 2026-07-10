"use client"

import { useState } from "react"
import { Bot, CheckCheck, Hand, Undo2 } from "lucide-react"
import { Modal } from "@/shared/components/ui/modal"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { useAlert } from "@/core/providers/alert-provider"
import { useAuth } from "@/shared/auth/auth.hooks"
import { errorMessage as formatError } from "@/core/lib/error-messages"
import { API_ERROR_CODES, HttpError } from "@/core/api/problem"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"

/**
 * Acciones de handoff según el `mode` de la conversación y los permisos:
 * - human_queued → Atender (claim)
 * - ai_active   → Intervenir (takeover, pausa la IA)
 * - human_active → Devolver a la IA (con nota) · Cerrar (resolved + razón)
 * Van por WS con ack; `handoff_conflict` ya lo auto-corrige el hook del socket.
 */
export function HandoffActions({
  conversation,
  commands,
}: {
  conversation: ConversationDTO
  commands: InboxCommands
}) {
  const { showAlert } = useAlert()
  const { hasPermission } = useAuth()
  const [busy, setBusy] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [note, setNote] = useState("")
  const [reason, setReason] = useState("")
  const [resolved, setResolved] = useState(true)

  const canClaim = hasPermission("conversations:claim")
  if (!canClaim || conversation.status !== "open") return null

  const run = async (action: () => ReturnType<InboxCommands["claim"]>, successTitle: string) => {
    if (busy) return
    setBusy(true)
    try {
      const ack = await action()
      if (ack.ok) {
        showAlert({ tone: "success", title: successTitle, open: true, autoCloseMs: 3000 })
      } else if (ack.error.code !== API_ERROR_CODES.handoffConflict) {
        showAlert({ tone: "error", title: ack.error.message || "No se pudo completar la acción", open: true })
      } else {
        showAlert({
          tone: "error",
          title: formatError(new HttpError({ status: 409, code: ack.error.code, message: ack.error.message })),
          open: true,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {conversation.mode === "human_queued" && (
        <Button size="sm" disabled={busy} onClick={() => void run(() => commands.claim(conversation.id), "Conversación asignada a ti")}>
          <Hand className="size-4" /> Atender
        </Button>
      )}

      {conversation.mode === "ai_active" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => commands.takeover(conversation.id), "Tomaste la conversación (IA en pausa)")}>
          <Hand className="size-4" /> Intervenir
        </Button>
      )}

      {conversation.mode === "human_active" && (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setReturnOpen(true)}>
            <Bot className="size-4" /> Devolver a la IA
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setCloseOpen(true)}>
            <CheckCheck className="size-4" /> Cerrar
          </Button>
        </>
      )}

      {/* Devolver a la IA con nota opcional */}
      <Modal
        open={returnOpen}
        onOpenChange={setReturnOpen}
        config={{
          title: "Devolver a la IA",
          description: "La IA retoma la conversación. Puedes dejarle contexto.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "return-cancel" },
            {
              label: "Devolver",
              variant: "default",
              asClose: false,
              id: "return-confirm",
              onClick: async () => {
                await run(() => commands.returnToAi(conversation.id, note.trim() || undefined), "Conversación devuelta a la IA")
                setReturnOpen(false)
                setNote("")
              },
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota para la IA (opcional): “el cliente ya pagó, confirma el envío”"
          maxLength={2000}
        />
      </Modal>

      {/* Cerrar con resolved + razón */}
      <Modal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        config={{
          title: "Cerrar conversación",
          description: "La conversación sale de la bandeja de abiertas.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "close-cancel" },
            {
              label: "Cerrar conversación",
              variant: "default",
              asClose: false,
              id: "close-confirm",
              onClick: async () => {
                await run(
                  () => commands.close(conversation.id, { resolved, ...(reason.trim() ? { reason: reason.trim() } : {}) }),
                  resolved ? "Conversación resuelta" : "Conversación cerrada",
                )
                setCloseOpen(false)
                setReason("")
              },
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={resolved} onCheckedChange={setResolved} aria-label="Marcar como resuelta" />
            Marcar como resuelta
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Razón (opcional)"
            maxLength={500}
          />
        </div>
      </Modal>

      {conversation.mode === "human_active" && (
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Undo2 className="size-3" /> Atendiendo tú
        </span>
      )}
    </div>
  )
}
