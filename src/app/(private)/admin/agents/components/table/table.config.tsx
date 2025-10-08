"use client"

import { listAgents } from "../../services";
import type { ApiResponse } from "@/shared/api";
import { AgentRowActions } from "./table.actions";
import type { ColumnDef, DataRow } from "@/components/features/data-table/types";
import type { AgentDTO, AgentRow, ApiAgentsPayload, ListAgentsParams } from "../../model";

export const agentColumns: ColumnDef[] = [
  { accessorKey: "name", header: "Nombre", sortable: true, alwaysVisible: true, minWidth: 200 },
  { accessorKey: "phone", header: "Teléfono", sortable: true, minWidth: 180 },
  { accessorKey: "company_name", header: "Empresa", sortable: true, minWidth: 200 },
  { accessorKey: "alive", header: "Disponible", sortable: true, minWidth: 120, cell: ({ row }) => (
    <span className={`inline-flex items-center gap-2 ${row.original.alive ? "text-green-700" : "text-red-700"}`}>
      <span className={`h-2 w-2 rounded-full ${row.original.alive ? "bg-green-500" : "bg-red-500"}`} />
      {row.original.alive ? "Sí" : "No"}
    </span>
  ) },
  {
    id: "actions",
    minWidth: 100,
    alwaysVisible: true,
    cell: ({ row }) => <AgentRowActions row={row.original as DataRow} />,
  },
];

export const agentData: AgentRow[] = [];

// Service glue to fetch with sorting/filter/pagination
export async function fetchAgents(params: ListAgentsParams): Promise<{ rows: AgentRow[]; total: number }>
{
  const res: ApiResponse<ApiAgentsPayload> = await listAgents(params);
  const payload = res.data;
  const rows: AgentRow[] = payload.agents.map((a: AgentDTO) => ({
    id: String(a.id),
    name: String(a.name ?? ""),
    phone: String(a.phone ?? ""),
    company_name: (a as any).company_name ? String((a as any).company_name) : a.company?.name ? String(a.company.name) : undefined,
    alive: Boolean(a.alive),
  }));
  return { rows, total: payload.total };
}