"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/features/data-table"
import type { QuickActionRow } from "@/modules/quick-actions/domain/quick-action"
import {
  fetchQuickActions,
  quickActionColumns,
} from "@/modules/quick-actions/ui/tables/config/quick-action.config"

/**
 * Acciones rápidas del tenant (W5): recursos multimedia (la "carta"),
 * respuestas de texto y plantillas que operadores y agentes IA envían con un
 * clic. Crear/editar abren modal por ruta interceptada (@form).
 */
export default function QuickActionsPage() {
  const router = useRouter()
  const { showAlert } = useAlert()
  const [rows, setRows] = useState<QuickActionRow[]>([])

  async function load() {
    try {
      const { rows: fetched } = await fetchQuickActions()
      setRows(fetched)
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudieron cargar las acciones rápidas"),
        open: true,
      })
    }
  }

  useEffect(() => {
    void load()
    // Refresca al crear/editar (modal) y al eliminar (fila)
    const refresh = () => void load()
    window.addEventListener("quick-actions:save:success", refresh)
    window.addEventListener("quick-actions:delete:success", refresh)
    return () => {
      window.removeEventListener("quick-actions:save:success", refresh)
      window.removeEventListener("quick-actions:delete:success", refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Acciones rápidas</h1>
          <p className="text-sm text-muted-foreground">
            Recursos y respuestas que tu equipo y los agentes IA envían con un clic.
          </p>
        </div>
        <Button
          variant="default"
          className="rounded-full"
          onClick={() => router.push("/settings/quick-actions/create")}
        >
          <Plus className="size-4" />
          Nueva acción
        </Button>
      </div>

      <DataTable<QuickActionRow>
        data={rows}
        columns={quickActionColumns}
        pagination={{ pageSize: 10 }}
        preferredSearchFields={["name", "description"]}
      />
    </div>
  )
}
