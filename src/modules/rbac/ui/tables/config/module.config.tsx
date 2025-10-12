"use client"

import { ModuleRowActions } from "../module.actions"
import type { ApiResponse } from "@/core/services/api"
import type { ColumnDef } from "@/shared/components/features/data-table/types"
import { listRbacModules } from "../../../infrastructure/overview-service.adapter"
import type { ApiRbacModulesSummaryPayload, RbacModuleSummaryDTO } from "@/modules/rbac/domain/overview"

export type ModuleRow = {
  id: number
  name: string
  code: string
  path: string
  is_public: boolean
}

export const moduleColumns: ColumnDef<ModuleRow>[] = [
  { accessorKey: "name", header: "Módulo", sortable: true, alwaysVisible: true },
  { accessorKey: "code", header: "Código", sortable: true, alwaysVisible: true },
  { accessorKey: "path", header: "Ruta", sortable: true },
  { accessorKey: "is_public", header: "Público", sortable: true, cell: ({ row }) => ((row.original as ModuleRow).is_public ? "Sí" : "No") },
  { id: "actions", minWidth: 100, cell: ({ row }) => <ModuleRowActions row={row.original as any} /> },
]

export async function fetchModules(params: Record<string, unknown>): Promise<{ rows: ModuleRow[]; total: number }> {
  const res: ApiResponse<ApiRbacModulesSummaryPayload> = await listRbacModules(params as any)
  const payload = res.data
  const rows: ModuleRow[] = payload.modules.map(flattenModule)
  return { rows, total: payload.total }
}

function flattenModule(m: RbacModuleSummaryDTO): ModuleRow {
  return {
    id: m.id,
    name: m.name,
    code: m.code,
    path: m.path,
    is_public: m.is_public,
  }
}