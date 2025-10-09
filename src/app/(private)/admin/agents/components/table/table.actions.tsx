"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Eye, MoreHorizontal, Pencil } from "lucide-react"
import type { DataRow } from "@/components/features/data-table/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function AgentRowActions({ row }: { row: DataRow }) {
  const [copying, setCopying] = useState(false)

  const onCopy = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(JSON.stringify(row))
      window.dispatchEvent(new CustomEvent("agents:copy", { detail: { id: row.id } }))
    } finally {
      setCopying(false)
    }
  }

  const onView = () => {
    window.dispatchEvent(new CustomEvent("agents:view:open", { detail: { defaults: row } }))
  }

  const onEdit = () => {
    window.dispatchEvent(new CustomEvent("agents:edit:open", { detail: { defaults: row } }))
  }

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
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem className="flex items-center gap-2" onClick={onCopy}>
            <Copy className="h-4 w-4" />
            {copying ? "Copiando..." : "Copiar objeto"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex items-center gap-2" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Editar agente
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2" onClick={onView}>
            <Eye className="h-4 w-4" />
            Ver agente
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}