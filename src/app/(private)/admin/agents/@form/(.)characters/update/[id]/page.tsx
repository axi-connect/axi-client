"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Modal } from "@/components/ui/modal"
import { CharacterForm } from "@/modules/agents/ui/forms/CharacterForm"
import { useAgent } from "@/modules/agents/infrastructure/agent.context"

export default function AgentsInterceptCharactersUpdate() {
  const router = useRouter()
  const [defaults, setDefaults] = useState<any | null>(null)
  const { selectedCharacter, fetchCharacters } = useAgent()

  const onModalSubmitClick = () => {
    const form = document.getElementById("character-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  const handleSuccess = () => {
    router.back()
    fetchCharacters()
  }

  useEffect(() => {
    if (selectedCharacter) setDefaults(selectedCharacter)
  }, [selectedCharacter])

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Actualizar personaje",
        description: "Edita la apariencia y voz del personaje del agente",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "character-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "character-save" },
        ],
      }}
    >
      <CharacterForm host={{ defaultValues: defaults ?? undefined }} onSuccess={handleSuccess} />
    </Modal>
  )
}