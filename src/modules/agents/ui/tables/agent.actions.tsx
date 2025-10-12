"use client"

import { Button } from "@/components/ui/button"
import type { DataRow } from "@/components/features/data-table/types"
import { Copy, Eye, MoreHorizontal, Pencil, Trash } from "lucide-react"
import { useAgentStore } from "@/modules/agents/infrastructure/agent.store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function AgentRowActions({ row }: { row: DataRow }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú de acciones</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <AgentContextMenuItems row={row} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AgentContextMenuItems({ row }: { row: DataRow }) {
  const { actions } = useAgentStore()

  return (
    <>
      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => actions.onCopy(row)}>
        <Copy className="h-4 w-4" />
        Copiar objeto
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => actions.onEdit(row)}>
        <Pencil className="h-4 w-4" />
        Editar
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => actions.onView(row)}>
        <Eye className="h-4 w-4" />
        Ver detalles
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => actions.onDelete(row)}>
        <Trash className="h-4 w-4 text-red-500" />
        Eliminar agente
      </DropdownMenuItem>
    </>
  )
}