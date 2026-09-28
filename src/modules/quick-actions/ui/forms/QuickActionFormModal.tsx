"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { Modal } from "@/shared/components/ui/modal"
import { FormSkeleton } from "@/shared/components/features/loading"
import type { QuickActionDTO } from "@/modules/quick-actions/domain/quick-action"
import { getQuickAction } from "@/modules/quick-actions/infrastructure/services/quick-action-service.adapter"
import { QuickActionForm } from "@/modules/quick-actions/ui/forms/QuickActionForm"

/** A dónde cae el modal si se abrió por URL directa, sin historial propio. */
export const QUICK_ACTIONS_LIST_HREF = "/settings/quick-actions"

/**
 * Modal de crear (sin `actionId`) o editar una acción rápida. Lo montan la
 * ruta INTERCEPTADA y su gemela REAL (recargar la URL daba 404). Cerrar o
 * guardar vuelve atrás si hay de dónde; si no, a la lista.
 */
export function QuickActionFormModal({ actionId }: { actionId?: string }) {
  const router = useRouter()
  const { showAlert } = useAlert()
  const editing = actionId !== undefined
  const [action, setAction] = useState<QuickActionDTO | null>(null)

  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back()
    else router.replace(QUICK_ACTIONS_LIST_HREF)
  }

  useEffect(() => {
    if (actionId === undefined) return
    getQuickAction(actionId)
      .then(setAction)
      .catch((err: unknown) => {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo cargar la acción") })
        close()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId])

  const onSuccess = () => {
    window.dispatchEvent(new CustomEvent("quick-actions:save:success"))
    close()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      config={{
        title: editing ? "Editar acción rápida" : "Nueva acción rápida",
        description: editing
          ? (action?.name ?? "")
          : "Recurso, respuesta o plantilla que tu equipo y los agentes IA envían con un clic",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "quick-action-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "quick-action-save",
            onClick: () => (document.getElementById("quick-action-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      {!editing ? (
        <QuickActionForm onSuccess={onSuccess} />
      ) : action ? (
        <QuickActionForm action={action} onSuccess={onSuccess} />
      ) : (
        <FormSkeleton fields={5} />
      )}
    </Modal>
  )
}
