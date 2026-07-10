"use client"

import { useRouter } from "next/navigation"
import { Modal } from "@/shared/components/ui/modal"
import { useAlert } from "@/core/providers/alert-provider"
import { AgentForm } from "@/modules/agents/ui/forms/AgentForm"
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context"

export default function AgentsInterceptCreate() {
  const router = useRouter()
  const { showAlert } = useAlert()
  const { fetchAgents } = useAgent()

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Crear agente",
        description: "Registra un nuevo agente IA y sus capacidades",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "agent-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "agent-save",
            onClick: () => (document.getElementById("agent-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      <AgentForm
        host={{
          setAlert: (cfg) => showAlert({ tone: cfg.variant === "destructive" ? "error" : "success", title: cfg.title, open: true }),
          onSuccess: () => {
            void fetchAgents()
            router.back()
          },
        }}
      />
    </Modal>
  )
}
