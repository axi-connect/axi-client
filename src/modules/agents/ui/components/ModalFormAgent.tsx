import { useRouter } from "next/navigation"
import { Modal } from "@/shared/components/ui/modal"
import { AgentForm } from "@/modules/agents/ui/forms/AgentForm"

export default function ModalFormAgent({ refresh }: { refresh: () => void }) {
  const router = useRouter()

  const onModalSubmitClick = () => {
    const form = document.getElementById("agent-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  const handleSuccess = () => {
    refresh()
    router.back()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Crear Agente",
        description: "Registra un nuevo agente virtual y sus capacidades iniciales",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "agent-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "agent-save" },
        ],
      }}
    >
      <AgentForm host={{ onSuccess: handleSuccess }} />
    </Modal>
  )
}