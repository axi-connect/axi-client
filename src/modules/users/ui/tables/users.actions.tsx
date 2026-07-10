"use client"

import { useState } from "react"
import { Modal } from "@/shared/components/ui/modal"
import { Button } from "@/shared/components/ui/button"
import { errorMessage } from "@/core/lib/error-messages"
import { Eye, MoreHorizontal, Pencil, Trash } from "lucide-react"
import type { UserRow } from "@/modules/users/domain/user"
import { deleteUser, getUserById } from "@/modules/users/infrastructure/services/user-service.adapter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

/**
 * Acciones de fila de usuarios. Comunicación con la página vía CustomEvents
 * (`users:edit:open`, `users:view:open`, `users:delete:success`, `users:error`).
 */
async function openUserDetail(id: string, event: "users:edit:open" | "users:view:open") {
  try {
    document.body.style.cursor = "wait"
    const user = await getUserById(id)
    window.dispatchEvent(
      new CustomEvent(event, {
        detail: {
          defaults: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
            avatar_url: user.avatar_url ?? "",
            role_id: user.role.id,
            status: user.status === "disabled" ? "disabled" : "active",
          },
        },
      }),
    )
  } catch (err) {
    window.dispatchEvent(new CustomEvent("users:error", { detail: { message: errorMessage(err, "No se pudo cargar el detalle del usuario") } }))
  } finally {
    document.body.style.cursor = "default"
  }
}

export function UserRowActions({ user }: { user: UserRow }) {
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleConfirmDelete = async () => {
    if (submitting) return
    try {
      setSubmitting(true)
      await deleteUser(user.id)
      window.dispatchEvent(new CustomEvent("users:delete:success", { detail: { id: user.id } }))
      setConfirmOpen(false)
    } catch (err) {
      window.dispatchEvent(new CustomEvent("users:error", { detail: { message: errorMessage(err, "No se pudo eliminar el usuario") } }))
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
          <UserContextMenuItems user={user} onDeleteClick={() => setConfirmOpen(true)} />
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Eliminar usuario",
          description: `¿Seguro que deseas eliminar a “${user.name}”? Esta acción es permanente.`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "user-delete-cancel" },
            { label: submitting ? "Eliminando..." : "Eliminar", variant: "destructive", asClose: false, onClick: handleConfirmDelete, id: "user-delete-confirm" },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer. Se eliminarán los datos asociados a este usuario.
        </div>
      </Modal>
    </div>
  )
}

export function UserContextMenuItems({ user, onDeleteClick }: { user: UserRow; onDeleteClick: () => void }) {
  return (
    <>
      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => void openUserDetail(user.id, "users:view:open")}>
        <Eye className="h-4 w-4" />
        <span>Ver usuario</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-2" onClick={() => void openUserDetail(user.id, "users:edit:open")}>
        <Pencil className="h-4 w-4" />
        <span>Editar</span>
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center gap-2 text-destructive" onClick={onDeleteClick}>
        <Trash className="h-4 w-4" />
        <span>Eliminar</span>
      </DropdownMenuItem>
    </>
  )
}
