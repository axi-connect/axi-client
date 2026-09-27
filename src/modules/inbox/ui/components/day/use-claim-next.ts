"use client"

import { useState } from "react"
import { API_ERROR_CODES, HttpError } from "@/core/api/problem"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { useAuth } from "@/shared/auth/auth.hooks"
import type { InboxConversation } from "@/modules/inbox/domain/inbox"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"

/**
 * «Atender a Mariana» desde la isla «Lo próximo» o la franja del celular:
 * `claim` por el socket con ack y, si sale, se abre la conversación. Sin
 * permiso de handoff la acción solo la abre («Abrir a Mariana»).
 *
 * Un `handoff_conflict` (otra persona la tomó primero) se traduce a su frase;
 * la cola se corrige sola con el evento del socket.
 */
export function useClaimNext(commands: InboxCommands | undefined) {
  const { showAlert } = useAlert()
  const { hasPermission } = useAuth()
  const select = useInboxStore((s) => s.select)
  const [busy, setBusy] = useState(false)
  const canClaim = commands !== undefined && hasPermission("conversations:claim")

  const run = async (head: InboxConversation) => {
    if (busy) return
    if (!canClaim) {
      void select(head.id)
      return
    }
    setBusy(true)
    try {
      const ack = await commands.claim(head.id)
      if (ack.ok) {
        await select(head.id)
        return
      }
      showAlert({
        tone: "error",
        title:
          ack.error.code === API_ERROR_CODES.handoffConflict
            ? errorMessage(new HttpError({ status: 409, code: ack.error.code, message: ack.error.message }))
            : ack.error.message || "No pudimos asignarte la conversación",
      })
    } finally {
      setBusy(false)
    }
  }

  return { canClaim, busy, run }
}
