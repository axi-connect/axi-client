"use client"

import type { ApiResponse } from "@/shared/api";
import { UserRowActions } from "@/modules/users/ui/table/users.actions";
import { listUsers } from "@/modules/users/infrastructure/user-service.adapter";
import type { ColumnDef, DataRow } from "@/components/features/data-table/types";
import type { ApiUsersPayload, ListUsersParams, UserDTO, UserRow } from "@/modules/users/domain/user";

export const userColumns: ColumnDef[] = [
  {
    accessorKey: "avatar",
    header: "Avatar",
    minWidth: 80,
    alwaysVisible: true,
    cell: ({ row }) => {
      const u = row.original as DataRow & { avatar?: string | null; name?: string };
      const url = u.avatar || "";
      const name = String(u.name ?? "");
      return (
        <div className="flex items-center justify-start">
          {/* Evita dependencia adicional, usa <img> simple */}
          <img
            src={url || undefined}
            alt={name ? `Avatar de ${name}` : "Avatar"}
            className="h-8 w-8 rounded-full object-cover bg-muted"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "";
            }}
          />
        </div>
      );
    },
  },
  { accessorKey: "name", header: "Nombre", sortable: true, alwaysVisible: true },
  { accessorKey: "email", header: "Email", sortable: true},
  { accessorKey: "phone", header: "Teléfono", sortable: true },
  { accessorKey: "role_name", header: "Rol", sortable: true },
  { accessorKey: "company_name", header: "Empresa", sortable: true },
  { accessorKey: "status", header: "Estado", sortable: true },
  {
    id: "actions",
    minWidth: 100,
    alwaysVisible: true,
    cell: ({ row }) => <UserRowActions user={row.original as DataRow} />,
  },
];

export const usersData: UserRow[] = [];

// Service glue to fetch with sorting/filter/pagination
export async function fetchUsers(params: ListUsersParams): Promise<{ rows: UserRow[]; total: number }>
{
  const res: ApiResponse<ApiUsersPayload> = await listUsers(params);
  const payload = res.data;
  const rows: UserRow[] = payload.users.map((u: UserDTO) => ({
    id: String(u.id),
    avatar: (u as any).avatar ?? null,
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    phone: u.phone ? String(u.phone) : undefined,
    role_name: (u as any).role_name ? String((u as any).role_name) : u.role?.name ? String(u.role.name) : undefined,
    company_name: (u as any).company_name ? String((u as any).company_name) : u.company?.name ? String(u.company.name) : undefined,
    status: undefined,
  }));
  return { rows, total: payload.total };
}