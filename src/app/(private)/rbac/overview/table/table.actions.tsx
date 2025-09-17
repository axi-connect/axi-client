"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { DataRow } from "@/components/ui/data-table/types"
import { Copy, Eye, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function RbacRowActions({ row }: { row: DataRow }) {
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
          <RbacContextMenuItems
            row={row}
            onViewClick={() => window.dispatchEvent(new CustomEvent("rbac:view:open", { detail: { defaults: row } }))}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function RbacContextMenuItems({ row, onViewClick, kind = "dropdown" }: {
  row: DataRow
  onViewClick: () => void
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
    </>
  )
}