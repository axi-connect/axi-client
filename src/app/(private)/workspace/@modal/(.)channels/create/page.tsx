"use client"

import { useRouter } from "next/navigation"
import { Modal } from "@/shared/components/ui/modal"
import ChannelForm from "@/modules/channels/ui/forms/ChannelForm"
import { useChannelStore } from "@/modules/channels/infrastructure/store/channels.store"

export default function ChannelsInterceptCreate() {
  const router = useRouter()
  const { fetchChannels } = useChannelStore()

  const onModalSubmitClick = () => {
    const form = document.getElementById("channels-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  const handleSuccess = () => {
    fetchChannels();
    router.back()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Crear Nuevo Canal",
        description: "Registra un canal de comunicación para ser automatizado",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "channel-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "channel-save" },
        ],
      }}
    >
      <ChannelForm onSuccess={handleSuccess} />
    </Modal>
  )
}