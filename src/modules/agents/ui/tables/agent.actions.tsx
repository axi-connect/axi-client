"use client"

import { Button } from "@/shared/components/ui/button"
import { Eye, MoreHorizontal, Pencil, Trash } from "lucide-react"
import type { AgentRow } from "@/modules/agents/domain/agent"
import { useAgentStore } from "@/modules/agents/infrastructure/stores/agent.store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

export function AgentRowActions({ row }: { row: AgentRow }) {
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

export function AgentContextMenuItems({ row }: { row: AgentRow }) {
  const { actions } = useAgentStore()

  return (
    <>
      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => actions.onView(row)}>
        <Eye className="h-4 w-4" />
        Ver detalles
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => actions.onEdit(row)}>
        <Pencil className="h-4 w-4" />
        Editar
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="flex items-center gap-2 text-destructive" onClick={() => actions.onDelete(row)}>
        <Trash className="h-4 w-4" />
        Eliminar agente
      </DropdownMenuItem>
    </>
  )
}
