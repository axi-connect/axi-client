"use client"

import { useMemo } from "react"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import type { QuickActionDTO } from "@/modules/quick-actions/domain/quick-action"
import {
  createQuickAction,
  updateQuickAction,
} from "@/modules/quick-actions/infrastructure/services/quick-action-service.adapter"
import { useQuickActionsStore } from "@/modules/quick-actions/infrastructure/stores/quick-actions.store"
import {
  buildQuickActionFormFields,
  defaultQuickActionFormValues,
  quickActionFormSchema,
  quickActionToFormValues,
  toCreateQuickActionDTO,
  toUpdateQuickActionDTO,
  type QuickActionFormValues,
} from "./config/quick-action.config"

/**
 * Formulario crear/editar acción rápida (`POST/PATCH /quick-actions`).
 * Vive dentro del Modal de la ruta interceptada (@form): el botón Guardar del
 * modal dispara `requestSubmit()` por el id `quick-action-form`.
 */
export function QuickActionForm({
  action,
  onSuccess,
}: {
  /** undefined = crear; con valor = editar (type inmutable). */
  action?: QuickActionDTO
  onSuccess: () => void
}) {
  const { showAlert } = useAlert()
  const invalidate = useQuickActionsStore((state) => state.invalidate)
  const editing = Boolean(action)

  const defaultValues = useMemo(
    () => (action ? quickActionToFormValues(action) : defaultQuickActionFormValues),
    [action],
  )
  const fields = useMemo(() => buildQuickActionFormFields({ editing }), [editing])

  return (
    <DynamicForm<QuickActionFormValues>
      id="quick-action-form"
      schema={quickActionFormSchema}
      fields={[...fields]}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        try {
          if (action) {
            await updateQuickAction(action.id, toUpdateQuickActionDTO(values))
          } else {
            await createQuickAction(toCreateQuickActionDTO(values))
          }
          invalidate()
          showAlert({
            tone: "success",
            title: action ? "Acción actualizada" : "Acción creada",
            open: true,
          })
          onSuccess()
        } catch (err) {
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(err, "No se pudo guardar la acción"),
              open: true,
            })
          }
        }
      }}
    />
  )
}
