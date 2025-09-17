"use client"

import { getRbacOverview } from "../../service";
import type { ApiResponse } from "@/shared/api";
import { RbacRowActions } from "./table.actions";
import type { ColumnDef } from "@/components/ui/data-table/types";
import type { ApiRbacOverviewSummaryPayload, GetRbacOverviewParams, RbacOverviewRow, RbacRoleSummaryDTO } from "../../model";

export const rbacOverviewColumns: ColumnDef[] = [
  { accessorKey: "name", header: "Rol", sortable: true, alwaysVisible: true },
  { accessorKey: "code", header: "Código", sortable: true, alwaysVisible: true },
  { accessorKey: "status", header: "Estado", sortable: true },
  { accessorKey: "hierarchy_level", header: "Jerarquía", sortable: true, cell: ({ row }) => <HierarchyBadge level={(row.original as any).hierarchy_level as number} /> },
  { id: "actions", minWidth: 100, cell: ({ row }) => <RbacRowActions row={row.original as any} /> },
]

export async function fetchRbacOverview(params: GetRbacOverviewParams): Promise<{ rows: RbacOverviewRow[]; summary: ApiRbacOverviewSummaryPayload["summary"]; total: number }> {
  const res: ApiResponse<ApiRbacOverviewSummaryPayload> = await getRbacOverview(params);
  const payload = res.data;
  const rows: RbacOverviewRow[] = payload.roles.map(flattenSummaryRole);
  return { rows, summary: payload.summary, total: rows.length };
}

function flattenSummaryRole(role: RbacRoleSummaryDTO): RbacOverviewRow {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    status: role.status,
    hierarchy_level: role.hierarchy_level,
  }
}

function HierarchyBadge({ level }: { level: number }) {
  const map: Record<number, { label: string; className: string }> = {
    0: { label: "Base", className: "bg-secondary text-foreground/80" },
    1: { label: "Operador", className: "bg-blue-50 text-blue-700 border border-blue-200" },
    2: { label: "Supervisor", className: "bg-amber-50 text-amber-700 border border-amber-200" },
    3: { label: "Administrador", className: "bg-purple-50 text-purple-700 border border-purple-200" },
  }
  const item = map[level] || { label: String(level), className: "bg-secondary text-foreground/80" }
  return <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${item.className}`}>{item.label}</span>
}