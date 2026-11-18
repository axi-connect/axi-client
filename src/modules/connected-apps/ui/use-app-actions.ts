"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { errorMessage } from "@/core/lib/error-messages"
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket"
import type { AssistantActionView } from "@/shared/components/features/assistant"
import {
  mergeAppAction,
  phaseFromDecision,
  visibleAppActions,
} from "@/modules/connected-apps/domain/app-actions"
import {
  confirmAppAction,
  listAppActions,
  rejectAppAction,
} from "@/modules/connected-apps/infrastructure/services/connected-apps-service.adapter"

export interface AppActionsState {
  status: "loading" | "ready" | "error"
  /** Pendientes y las decididas en esta visita, en el orden del servidor (más nuevas primero). */
  visible: AssistantActionView[]
  reload: () => void
  decide: (id: string, kind: "confirm" | "reject") => void
}

/**
 * Lo que las apps conectadas dejaron pendiente con el usuario de esta persona
 * (F5 «Axel OS»). Se relee al montar, al reconectar el socket y con cada
 * `assistant.action_pending|decided` de la puerta MCP. Nada se marca hecho
 * hasta que el servidor responde.
 */
export function useAppActions(): AppActionsState {
  const [status, setStatus] = useState<AppActionsState["status"]>("loading")
  const [order, setOrder] = useState<string[]>([])
  const [actions, setActions] = useState<Record<string, AssistantActionView>>({})
  const [decidedHere, setDecidedHere] = useState<ReadonlySet<string>>(() => new Set())
  const actionsRef = useRef(actions)
  useEffect(() => {
    actionsRef.current = actions
  }, [actions])

  const reload = useCallback(() => {
    listAppActions()
      .then((dtos) => {
        setActions((current) => {
          const next: Record<string, AssistantActionView> = {}
          for (const dto of dtos) next[dto.id] = mergeAppAction(current[dto.id], dto)
          return next
        })
        setOrder(dtos.map((dto) => dto.id))
        setStatus("ready")
      })
      .catch(() => setStatus((current) => (current === "ready" ? current : "error")))
  }, [])

  const patch = useCallback((id: string, change: Partial<AssistantActionView>) => {
    setActions((current) => {
      const action = current[id]
      return action === undefined ? current : { ...current, [id]: { ...action, ...change } }
    })
  }, [])

  const decide = useCallback(
    (id: string, kind: "confirm" | "reject") => {
      patch(id, { busy: kind, error: null })
      const call = kind === "confirm" ? confirmAppAction(id) : rejectAppAction(id)
      call
        .then((decision) => {
          setDecidedHere((current) => new Set(current).add(id))
          if (decision.outcome === "not_pending") {
            // Otra pestaña o la propia app la decidió primero: se relee su estado real.
            patch(id, { busy: null })
            reload()
            return
          }
          patch(id, { busy: null, error: null, ...phaseFromDecision(decision) })
        })
        .catch((error: unknown) => {
          // No llegó: sigue pendiente y el botón vuelve a servir.
          patch(id, { busy: null, error: errorMessage(error) })
        })
    },
    [patch, reload],
  )

  useEffect(() => {
    reload()
  }, [reload])

  const { socket, connected } = useSocket("inbox")
  const everConnected = useRef(false)
  useEffect(() => {
    if (connected && everConnected.current) reload()
    if (connected) everConnected.current = true
  }, [connected, reload])

  useSocketEvent(socket, "assistant.action_pending", (payload) => {
    if (payload.door === "mcp") reload()
  })

  useSocketEvent(socket, "assistant.action_decided", (payload) => {
    if (payload.door !== "mcp") return
    const known = actionsRef.current[payload.action_id]
    // Si ESTA pantalla la está decidiendo, manda la respuesta de su POST.
    if (known !== undefined && known.busy !== null) return
    if (known !== undefined && payload.status !== "pending" && known.phase !== payload.status) {
      setDecidedHere((current) => new Set(current).add(payload.action_id))
      patch(payload.action_id, { phase: payload.status, text: null, error: null })
    }
    reload()
  })

  const list = order.flatMap((id) => (actions[id] === undefined ? [] : [actions[id]]))
  return { status, visible: visibleAppActions(list, decidedHere), reload, decide }
}
