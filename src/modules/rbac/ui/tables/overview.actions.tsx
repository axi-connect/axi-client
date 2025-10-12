"use client"

import { useState } from "react"
import { Modal } from "@/shared/components/ui/modal"
import { Button } from "@/shared/components/ui/button"
import { Copy, Eye, MoreHorizontal, Pencil, Trash } from "lucide-react"
import type { DataRow } from "@/shared/components/features/data-table/types"
import { getRbacOverviewRoleDetail, deleteRbacRole } from "@/modules/rbac/infrastructure/overview-service.adapter"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"

export function RbacRowActions({ row }: { row: DataRow }) {
  const onDeleteClick = () => setConfirmOpen(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const onViewClick = () => window.dispatchEvent(new CustomEvent("rbac:view:open", { detail: { defaults: row } }))
  
  const onEditClick = async () => {
    try {
      document.body.style.cursor = "wait";
      const id = (row as any).id as number
      const { data } = await getRbacOverviewRoleDetail(id)
      const role = data.roles?.[0]
      const defaults = role ? {
        id: role.id,
        name: role.name,
        description: role.description ?? "",
        status: (role as any).state ?? (role as any).status ?? "active",
        hierarchy_level: (role as any).hierarchy_level ?? 0,
        permissions: role.modules ? role.modules.map((rm: any) => ({ module_id: rm.id, permission: rm.permissions })) : [],
      } : { id: (row as any).id }
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("rbac:edit:open", { detail: { defaults } }))
    } catch {
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("rbac:error", { detail: { message: "No se pudo cargar el detalle del rol" } }))
    }
  }

  const handleConfirmDelete = async () => {
    if (submitting) return
    try {
      setSubmitting(true)
      const id = (row as any).id as number
      const res = await deleteRbacRole(id)
      if (res.successful) {
        window.dispatchEvent(new CustomEvent("rbac:delete:success", { detail: { id, message: res.message } }))
        setConfirmOpen(false)
      } else {
        window.dispatchEvent(new CustomEvent("rbac:delete:error", { detail: { id, message: res.message } }))
      }
    } catch {
      window.dispatchEvent(new CustomEvent("rbac:error", { detail: { message: "No se pudo eliminar el rol" } }))
    } finally {
      setSubmitting(false)
    }
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
          <RbacContextMenuItems row={row} onViewClick={onViewClick} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Eliminar rol",
          description: `¿Seguro que deseas eliminar el rol “${String((row as any).name ?? "")}”? Esta acción es permanente.`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "rbac-delete-cancel" },
            { label: submitting ? "Eliminando..." : "Eliminar", variant: "destructive", asClose: false, onClick: handleConfirmDelete, id: "rbac-delete-confirm" },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer. Se eliminarán de forma permanente los datos asociados a este rol.
        </div>
      </Modal>
    </div>
  )
}

export function RbacContextMenuItems({ row, onViewClick, onEditClick, onDeleteClick, kind = "dropdown" }: {
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