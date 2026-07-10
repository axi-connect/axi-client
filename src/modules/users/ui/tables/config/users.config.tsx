"use client"

import Image from "next/image"
import { Badge } from "@/shared/components/ui/badge"
import { UserRowActions } from "../users.actions"
import { listUsers } from "@/modules/users/infrastructure/services/user-service.adapter"
import type { ColumnDef } from "@/shared/components/features/data-table/types"
import type { UserRow, UserStatus } from "@/modules/users/domain/user"

const STATUS_LABELS: Record<UserStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Activo", variant: "default" },
  invited: { label: "Invitado", variant: "secondary" },
  disabled: { label: "Deshabilitado", variant: "destructive" },
}

export const userColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "avatar_url",
    header: "",
    minWidth: 60,
    alwaysVisible: true,
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center justify-start">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={`Avatar de ${user.name}`}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover bg-muted"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )
    },
  },
  { accessorKey: "name", header: "Nombre", sortable: true, alwaysVisible: true, minWidth: 180 },
  { accessorKey: "email", header: "Email", sortable: true, minWidth: 200 },
  { accessorKey: "phone", header: "Teléfono", minWidth: 130 },
  { accessorKey: "role_name", header: "Rol", sortable: true, minWidth: 120 },
  {
    accessorKey: "status",
    header: "Estado",
    sortable: true,
    minWidth: 120,
    cell: ({ row }) => {
      const status = STATUS_LABELS[row.original.status]
      return <Badge variant={status.variant}>{status.label}</Badge>
    },
  },
  {
    id: "actions",
    minWidth: 80,
    alwaysVisible: true,
    cell: ({ row }) => <UserRowActions user={row.original} />,
  },
]

/** Trae la colección completa (sin paginación server-side) y la mapea a filas. */
export async function fetchUsers(): Promise<{ rows: UserRow[]; total: number }> {
  const res = await listUsers()
  const rows: UserRow[] = res.data.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    status: user.status,
    role_id: user.role.id,
    role_name: user.role.name,
    last_login_at: user.last_login_at,
  }))
  return { rows, total: res.meta.total }
}
