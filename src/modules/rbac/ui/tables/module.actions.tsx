"use client"

import { Button } from "@/shared/components/ui/button"
import { Copy, Eye, MoreHorizontal, Pencil, Trash } from "lucide-react"
import type { DataRow } from "@/shared/components/features/data-table/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"

export function ModuleRowActions({ row }: { row: DataRow }) {
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
          <ModuleContextMenuItems
            row={row}
            onViewClick={() => window.dispatchEvent(new CustomEvent("modules:view:open", { detail: { defaults: row } }))}
            onEditClick={() => window.dispatchEvent(new CustomEvent("modules:edit:open", { detail: { defaults: row } }))}
            onDeleteClick={() => window.dispatchEvent(new CustomEvent("modules:delete:open", { detail: { module: row } }))}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function ModuleContextMenuItems({ row, onViewClick, onEditClick, onDeleteClick, kind = "dropdown" }: {
  row: DataRow
  onViewClick: () => void
  onEditClick: () => void
  onDeleteClick: () => void
  kind?: "dropdown" | "context"
}) {
  const Label = kind === "dropdown" ? DropdownMenuLabel : (props: any) => <div className={props.className}>{props.children}</div>
  const Separator = kind === "dropdown" ? DropdownMenuSeparator : (() => <div className="my-1 h-px w-full bg-border" />)
  const Item = kind === "dropdown" ? DropdownMenuItem : (({ className, onClick, children }: any) => (
    <button
      role="menuitem"
      className={`block w-full rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className ?? ""}`}
      onClick={onClick}
    >{children}</button>
  ))

  return (
    <>
      <Label>Acciones</Label>
      <Item className="flex items-center gap-2" onClick={() => navigator.clipboard.writeText(JSON.stringify(row))}>
        <Copy className="h-4 w-4" />
        Copiar Objeto
      </Item>
      <Separator />
      <Item className="flex items-center gap-2" onClick={onViewClick}>
        <Eye className="h-4 w-4" />
        <span>Ver detalles</span>
      </Item>
      <Item className="flex items-center gap-2" onClick={onEditClick}>
        <Pencil className="h-4 w-4" />
        <span>Editar</span>
      </Item>
      <Item className="flex items-center gap-2 text-red-500" onClick={onDeleteClick}>
        <Trash className="h-4 w-4" />
        <span>Eliminar</span>
      </Item>
    </>
  )
}