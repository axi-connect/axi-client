"use client"

import { useState } from "react"
import { parseHttpError } from "@/shared/api"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { deleteUser, getUserById } from "../service"
import type { DataRow } from "@/components/features/data-table/types"
import { Copy, Eye, MoreHorizontal, Pencil, Trash } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function UserRowActions({ user }: { user: DataRow }) {
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const onDeleteClick = () => setConfirmOpen(true)

  const onEditClick = async () => {
    try {
      document.body.style.cursor = "wait";
      const id = user.id as string | number
      const res = await getUserById(id)
      const payload = res.data
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("users:edit:open", { detail: { defaults: payload } }))
    } catch (err) {
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("users:error", { detail: { message: "No se pudo cargar el detalle del usuario" } }))
    }
  }

  const onViewClick = async () => {
    try {
      const id = user.id as string | number
      const res = await getUserById(id)
      const payload = res.data
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("users:view:open", { detail: { defaults: payload } }))
    } catch (err) {
      document.body.style.cursor = "default";
      window.dispatchEvent(new CustomEvent("users:error", { detail: { message: "No se pudo cargar el detalle del usuario" } }))
    }
  }

  const handleConfirmDelete = async () => {
    if (submitting) return
    try {
      setSubmitting(true)
      const id = user.id as string | number
      const res = await deleteUser(id)
      if (res.successful) {
        window.dispatchEvent(new CustomEvent("users:delete:success", { detail: { id, message: res.message } }))
        setConfirmOpen(false)
      } else {
        window.dispatchEvent(new CustomEvent("users:delete:error", { detail: { id, message: res.message } }))
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      window.dispatchEvent(new CustomEvent("users:delete:error", { detail: { id: (user as any).id, status, message } }))
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
          <UserContextMenuItems
            user={user}
            onDeleteClick={onDeleteClick}
            onEditClick={onEditClick}
            onViewClick={onViewClick}
            kind="dropdown"
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Eliminar usuario",
          description: `¿Seguro que deseas eliminar al usuario “${String(user.name ?? user.email ?? "")}”? Esta acción es permanente.`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "user-delete-cancel" },
            { label: submitting ? "Eliminando..." : "Eliminar", variant: "destructive", asClose: false, onClick: handleConfirmDelete, id: "user-delete-confirm" },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer. Se eliminarán de forma permanente los datos asociados a este usuario.
        </div>
      </Modal>
    </div>
  )
}

export function UserContextMenuItems({ user, onDeleteClick, onEditClick, onViewClick, kind = "dropdown" }: {
  user: DataRow
  onDeleteClick: () => void
  onEditClick: () => void
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
      <Item className="flex items-center gap-2" onClick={() => navigator.clipboard.writeText(JSON.stringify(user))}>
        <Copy className="h-4 w-4" />
        Copiar Objeto
      </Item>
      <Separator />
      <Item className="flex items-center gap-2" onClick={onViewClick}>
        <Eye className="h-4 w-4" />
        <span>Ver usuario</span>
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