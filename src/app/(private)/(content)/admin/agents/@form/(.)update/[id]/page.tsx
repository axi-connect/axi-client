"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/shared/components/ui/modal"
import { useParams, useRouter } from "next/navigation"
import { useAlert } from "@/core/providers/alert-provider"
import { errorMessage } from "@/core/lib/error-messages"
import { AgentForm } from "@/modules/agents/ui/forms/AgentForm"
import type { AiAgentDTO } from "@/modules/agents/domain/agent"
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context"
import { getAgentById } from "@/modules/agents/infrastructure/services/agent-service.adapter"

export default function AgentsInterceptUpdate() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const { showAlert } = useAlert()
  const { fetchAgents } = useAgent()
  const [agent, setAgent] = useState<AiAgentDTO | null>(null)

  useEffect(() => {
    if (!id) return
    getAgentById(id)
      .then(setAgent)
      .catch((err) => {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo cargar el agente") })
        router.back()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Actualizar agente",
        description: agent ? `Edita “${agent.name}”` : "Cargando…",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "agent-update-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "agent-update-save",
            onClick: () => (document.getElementById("agent-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      {agent && (
        <AgentForm
          key={agent.id}
          host={{
            agent,
            setAlert: (cfg) => showAlert({ tone: cfg.variant === "destructive" ? "error" : "success", title: cfg.title, open: true }),
            onSuccess: () => {
              void fetchAgents()
              router.back()
            },
          }}
        />
      )}
    </Modal>
  )
}
