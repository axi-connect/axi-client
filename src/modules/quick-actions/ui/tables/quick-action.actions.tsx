"use client"

import { useRouter } from "next/navigation"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import type { QuickActionRow } from "@/modules/quick-actions/domain/quick-action"
import { deleteQuickAction } from "@/modules/quick-actions/infrastructure/services/quick-action-service.adapter"
import { useQuickActionsStore } from "@/modules/quick-actions/infrastructure/stores/quick-actions.store"

/**
 * Menú ⋮ de la fila (W5): Editar abre el modal por ruta interceptada;
 * Eliminar confirma con Modal y notifica a la tabla vía CustomEvent
 * (`quick-actions:delete:success`, convención familia:acción:estado).
 */
export function QuickActionRowActions({ row }: { row: QuickActionRow }) {
  const router = useRouter()
  const { showAlert, showModal, closeModal } = useAlert()
  const invalidate = useQuickActionsStore((state) => state.invalidate)

  const handleDelete = async () => {
    try {
      await deleteQuickAction(row.id)
      invalidate()
      window.dispatchEvent(new CustomEvent("quick-actions:delete:success"))
      showAlert({ tone: "success", title: "Acción eliminada", open: true })
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar la acción"), open: true })
    } finally {
      closeModal()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${row.name}`}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => router.push(`/settings/quick-actions/update/${row.id}`)}
        >
          <Pencil className="size-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive"
          onClick={() =>
            showModal({
              title: "Eliminar acción rápida",
              description: `¿Seguro que deseas eliminar “${row.name}”? Los mensajes ya enviados no se ven afectados.`,
              actions: [
                { label: "Cancelar", variant: "outline", asClose: true, id: "qa-delete-cancel" },
                {
                  label: "Eliminar",
                  variant: "destructive",
                  asClose: false,
                  id: "qa-delete-confirm",
                  onClick: () => void handleDelete(),
                },
              ],
              className: "sm:max-w-md",
            })
          }
        >
          <Trash2 className="size-4" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
