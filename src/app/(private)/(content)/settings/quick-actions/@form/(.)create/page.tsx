"use client"

import { useRouter } from "next/navigation"
import { Modal } from "@/shared/components/ui/modal"
import { QuickActionForm } from "@/modules/quick-actions/ui/forms/QuickActionForm"

/** Modal interceptado de creación (URL compartible; back cierra). */
export default function QuickActionsInterceptCreate() {
  const router = useRouter()

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back()
      }}
      config={{
        title: "Nueva acción rápida",
        description: "Recurso, respuesta o plantilla que tu equipo y los agentes IA envían con un clic",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "quick-action-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "quick-action-save",
            onClick: () =>
              (document.getElementById("quick-action-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      <QuickActionForm
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("quick-actions:save:success"))
          router.back()
        }}
      />
    </Modal>
  )
}
