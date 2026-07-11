"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { Modal } from "@/shared/components/ui/modal"
import { FormSkeleton } from "@/shared/components/features/loading"
import type { QuickActionDTO } from "@/modules/quick-actions/domain/quick-action"
import { getQuickAction } from "@/modules/quick-actions/infrastructure/services/quick-action-service.adapter"
import { QuickActionForm } from "@/modules/quick-actions/ui/forms/QuickActionForm"

/** Modal interceptado de edición: carga la acción y precarga el formulario. */
export default function QuickActionsInterceptUpdate({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { showAlert } = useAlert()
  const [action, setAction] = useState<QuickActionDTO | null>(null)

  useEffect(() => {
    getQuickAction(id)
      .then(setAction)
      .catch((err: unknown) => {
        showAlert({
          tone: "error",
          title: errorMessage(err, "No se pudo cargar la acción"),
          open: true,
        })
        router.back()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back()
      }}
      config={{
        title: "Editar acción rápida",
        description: action?.name ?? "",
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
      {action ? (
        <QuickActionForm
          action={action}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("quick-actions:save:success"))
            router.back()
          }}
        />
      ) : (
        <FormSkeleton fields={5} />
      )}
    </Modal>
  )
}
