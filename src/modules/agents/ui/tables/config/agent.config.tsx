"use client"

import Image from "next/image";
import { cn } from "@/core/lib/utils";
import type { AgentRow  } from "@/modules/agents/domain/agent";
import { AgentRowActions } from "@/modules/agents/ui/tables/agent.actions";
import type { ColumnDef, DataRow } from "@/shared/components/features/data-table/types";

export const agentColumns: ColumnDef<AgentRow>[] = [
  { accessorKey: "avatar", header: "Avatar", sortable: true, alwaysVisible: true, minWidth: 80, cell: ({ row } ) => (
    <Image 
      width={32}
      height={32}
      alt={row.original.name} 
      src={row.original.avatar}
      className={cn("rounded-full object-cover", row.original.avatar_background)}
    />
  ) },
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