"use client"

import { Badge } from "@/shared/components/ui/badge";
import { AgentRowActions } from "@/modules/agents/ui/tables/agent.actions";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import {
  AGENT_STATUS_LABELS,
  AI_PROVIDER_LABELS,
  type AgentRow,
  type AgentStatus,
} from "@/modules/agents/domain/agent";

const STATUS_VARIANTS: Record<AgentStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  paused: "secondary",
  draft: "outline",
};

export const agentColumns: ColumnDef<AgentRow>[] = [
  { accessorKey: "name", header: "Nombre", sortable: true, alwaysVisible: true, minWidth: 180 },
  {
    accessorKey: "status",
    header: "Estado",
    sortable: true,
    minWidth: 110,
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANTS[row.original.status]}>
        {AGENT_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "provider",
    header: "Proveedor",
    sortable: true,
    minWidth: 150,
    cell: ({ row }) => AI_PROVIDER_LABELS[row.original.provider],
  },
  {
    accessorKey: "model",
    header: "Modelo",
    sortable: true,
    minWidth: 160,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.model}</span>,
  },
  {
    accessorKey: "intentions_count",
    header: "Intenciones",
    minWidth: 100,
    cell: ({ row }) => row.original.intentions_count,
  },
  {
    id: "actions",
    minWidth: 80,
    alwaysVisible: true,
    cell: ({ row }) => <AgentRowActions row={row.original} />,
  },
];
