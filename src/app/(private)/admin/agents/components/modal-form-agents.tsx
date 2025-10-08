import { AgentForm } from "./form"
import { useRouter } from "next/navigation"
import { Modal } from "@/components/ui/modal"

export default function ModalFormAgents() {
  const router = useRouter()

  const onModalSubmitClick = () => {
    const form = document.getElementById("agent-form") as HTMLFormElement | null
    form?.requestSubmit()
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
      <AgentForm
        host={{
          refresh: () => {},
          closeModal: () => router.back(),
        }}
      />
    </Modal>
  )
}