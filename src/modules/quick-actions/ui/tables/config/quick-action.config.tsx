"use client"

import { Badge } from "@/shared/components/ui/badge"
import type { ColumnDef } from "@/shared/components/features/data-table"
import {
  QUICK_ACTION_TYPE_LABELS,
  toQuickActionRow,
  type QuickActionRow,
} from "@/modules/quick-actions/domain/quick-action"
import { listQuickActions } from "@/modules/quick-actions/infrastructure/services/quick-action-service.adapter"
import { QuickActionRowActions } from "@/modules/quick-actions/ui/tables/quick-action.actions"

/** Columnas de la tabla de settings (W5) + fetch con mapeo DTO→Row. */
export const quickActionColumns: ColumnDef<QuickActionRow>[] = [
  { accessorKey: "name", header: "Nombre", sortable: true, alwaysVisible: true, minWidth: 160 },
  {
    accessorKey: "type",
    header: "Tipo",
    sortable: true,
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-[10px]">
        {QUICK_ACTION_TYPE_LABELS[row.original.type]}
        {row.original.type === "media_resource" && ` · ${String(row.original.assets_count)} archivo${row.original.assets_count === 1 ? "" : "s"}`}
      </Badge>
    ),
  },
  {
    accessorKey: "enabled",
    header: "Activa",
    cell: ({ row }) => (
      <Badge variant={row.original.enabled ? "default" : "outline"} className="text-[10px]">
        {row.original.enabled ? "Sí" : "No"}
      </Badge>
    ),
  },
  {
    accessorKey: "ai_enabled",
    header: "IA",
    cell: ({ row }) =>
      row.original.type === "media_resource" ? (
        <Badge variant={row.original.ai_enabled ? "default" : "outline"} className="text-[10px]">
          {row.original.ai_enabled ? "Sí" : "No"}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "updated_at",
    header: "Actualizada",
    sortable: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.original.updated_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    alwaysVisible: true,
    cell: ({ row }) => <QuickActionRowActions row={row.original} />,
  },
]

/** La colección por tenant es pequeña: se trae completa y la tabla resuelve
 * búsqueda/orden/paginación en cliente (patrón users). */
export async function fetchQuickActions(): Promise<{ rows: QuickActionRow[] }> {
  const res = await listQuickActions({ page: 1, page_size: 100 })
  return { rows: res.data.map(toQuickActionRow) }
}
