"use client"

import type { ApiResponse } from "@/shared/api";
import { RbacRowActions } from "../overview.actions";
import type { ColumnDef } from "@/components/features/data-table/types";
import { getRbacOverview } from "@/modules/rbac/infrastructure/overview-service.adapter";
import type { ApiRbacOverviewSummaryPayload, GetRbacOverviewParams, RbacOverviewRow, RbacRoleSummaryDTO } from "@/modules/rbac/domain/overview";

export const rbacOverviewColumns: ColumnDef[] = [
  { accessorKey: "name", header: "Rol", sortable: true, alwaysVisible: true, cell: ({ row }) => <span className="capitalize">{row.original.name}</span> },
  { accessorKey: "code", header: "Código", sortable: true, alwaysVisible: true },
  { accessorKey: "status", header: "Estado", cell: ({ row }) => <StatusBadge status={(row.original as any).status as string} /> },
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
  return <span className={`inline-block px-2 py-0.5 rounded-full ${item.className}`}>{item.label}</span>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`capitalize inline-block px-2 py-0.5 rounded-full ${status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{status}</span>
}