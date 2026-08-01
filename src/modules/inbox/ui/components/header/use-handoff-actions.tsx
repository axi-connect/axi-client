"use client"

import { useState } from "react"
import { Bot, CheckCheck, Hand, type LucideIcon } from "lucide-react"
import { Modal } from "@/shared/components/ui/modal"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { useAlert } from "@/core/providers/alert-provider"
import { useAuth } from "@/shared/auth/auth.hooks"
import { errorMessage as formatError } from "@/core/lib/error-messages"
import { API_ERROR_CODES, HttpError } from "@/core/api/problem"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"

/**
 * Acciones de handoff como DESCRIPTORES, para que la cabecera decida dónde va
 * cada una: la principal inline y las secundarias en el menú de desborde.
 *
 * Reemplaza al antiguo componente `HandoffActions`, que pintaba su propia fila.
 * El estado de los dos modales sigue viviendo en un único sitio (aquí) para no
 * duplicarlo entre el botón inline y el menú.
 *
 * Mapa de acciones por `mode`:
 * - `human_queued` → Atender (claim)
 * - `ai_active`    → Intervenir (takeover, pausa la IA)
 * - `human_active` → Devolver a la IA (con nota) · Cerrar (resolved + razón)
 *
 * Van por WS con ack; `handoff_conflict` ya lo auto-corrige el hook del socket,
 * aquí solo se traduce a un mensaje legible.
 */

export interface HandoffActionDescriptor {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
}

export interface HandoffActionsState {
  /** Acción destacada de la cabecera; `null` si no hay ninguna disponible. */
  primary: HandoffActionDescriptor | null
  /** Acciones para el menú de desborde. */
  secondary: HandoffActionDescriptor[]
  /** Los modales de nota y cierre; el consumidor debe renderizarlo. */
  dialogs: React.ReactNode
  busy: boolean
}

export function useHandoffActions(
  conversation: ConversationDTO,
  commands: InboxCommands,
): HandoffActionsState {
  const { showAlert } = useAlert()
  const { hasPermission } = useAuth()
  const [busy, setBusy] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [note, setNote] = useState("")
  const [reason, setReason] = useState("")
  const [resolved, setResolved] = useState(true)

  const run = async (action: () => ReturnType<InboxCommands["claim"]>, successTitle: string) => {
    if (busy) return
    setBusy(true)
    try {
      const ack = await action()
      if (ack.ok) {
        showAlert({ tone: "success", title: successTitle, open: true, autoCloseMs: 3000 })
      } else if (ack.error.code !== API_ERROR_CODES.handoffConflict) {
        showAlert({
          tone: "error",
          title: ack.error.message || "No se pudo completar la acción",
          open: true,
        })
      } else {
        showAlert({
          tone: "error",
          title: formatError(
            new HttpError({ status: 409, code: ack.error.code, message: ack.error.message }),
          ),
          open: true,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  // Sin permiso o fuera de `open` no hay ninguna transición legal: la cabecera
  // simplemente no pinta acciones (y no cambia de altura por ello).
  const available = hasPermission("conversations:claim") && conversation.status === "open"

  let primary: HandoffActionDescriptor | null = null
  const secondary: HandoffActionDescriptor[] = []

  if (available) {
    if (conversation.mode === "human_queued") {
      primary = {
        id: "claim",
        label: "Atender",
        icon: Hand,
        onSelect: () => void run(() => commands.claim(conversation.id), "Conversación asignada a ti"),
      }
    } else if (conversation.mode === "ai_active") {
      primary = {
        id: "takeover",
        label: "Intervenir",
        icon: Hand,
        onSelect: () =>
          void run(() => commands.takeover(conversation.id), "Tomaste la conversación (IA en pausa)"),
      }
    } else {
      // human_active: la conversación ya es de un humano. Lo frecuente es
      // cerrarla, así que esa es la acción destacada.
      primary = {
        id: "close",
        label: "Cerrar",
        icon: CheckCheck,
        onSelect: () => setCloseOpen(true),
      }
      secondary.push({
        id: "return_to_ai",
        label: "Devolver a la IA",
        icon: Bot,
        onSelect: () => setReturnOpen(true),
      })
    }
  }

  const dialogs = (
    <>
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
                await run(
                  () => commands.returnToAi(conversation.id, note.trim() || undefined),
                  "Conversación devuelta a la IA",
                )
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
                  () =>
                    commands.close(conversation.id, {
                      resolved,
                      ...(reason.trim() ? { reason: reason.trim() } : {}),
                    }),
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
            <Switch
              checked={resolved}
              onCheckedChange={setResolved}
              aria-label="Marcar como resuelta"
            />
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
    </>
  )

  return { primary, secondary, dialogs, busy }
}
