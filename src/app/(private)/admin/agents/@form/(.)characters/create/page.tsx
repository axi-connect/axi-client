"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Modal } from "@/shared/components/ui/modal"
import { CharacterForm } from "@/modules/agents/ui/forms/CharacterForm"
import { useAgent } from "@/modules/agents/infrastructure/agent.context"

export default function AgentsInterceptCharactersCreate() {
  const router = useRouter()
  const {  fetchCharacters } = useAgent()

  const onModalSubmitClick = () => {
    const form = document.getElementById("character-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  useEffect(() => {
    console.log("AgentsInterceptCharactersCreate")
    // could refresh listing context here if needed
  }, [])

  const handleSuccess = () => {
    router.back()
    fetchCharacters()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Crear personaje",
        description: "Define la apariencia y voz del personaje del agente",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "character-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "character-save" },
        ],
      }}
    >
      <CharacterForm onSuccess={handleSuccess} />
    </Modal>
  )
}