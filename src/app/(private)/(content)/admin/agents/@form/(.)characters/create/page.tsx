"use client"

import { useRouter } from "next/navigation"
import { Modal } from "@/shared/components/ui/modal"
import { useAlert } from "@/core/providers/alert-provider"
import { CharacterForm } from "@/modules/agents/ui/forms/CharacterForm"
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context"

export default function AgentsInterceptCharactersCreate() {
  const router = useRouter()
  const { showAlert } = useAlert()
  const { fetchCharacters } = useAgent()

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Crear character",
        description: "Define la apariencia del character del agente",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "character-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "character-save",
            onClick: () => (document.getElementById("character-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      <CharacterForm
        host={{
          setAlert: (cfg) => showAlert({ tone: cfg.variant === "destructive" ? "error" : "success", title: cfg.title, open: true }),
          onSuccess: () => {
            void fetchCharacters()
            router.back()
          },
        }}
      />
    </Modal>
  )
}
