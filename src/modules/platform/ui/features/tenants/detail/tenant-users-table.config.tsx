/**
 * Columnas del tab Usuarios (read-only: el endpoint no expone acciones y la
 * UI no simula lo que la API no soporta).
 */
import type { ColumnDef } from "@/shared/components/features/data-table";
import { Badge } from "@/shared/components/ui/badge";
import type { TenantUser } from "../../../../domain/tenant";
import { RelativeDate } from "../../../components/RelativeDate";
import { StatusBadge } from "../../../components/StatusBadge";

export const tenantUserColumns: ColumnDef<TenantUser>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    sortable: true,
    minWidth: 200,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    sortable: true,
    minWidth: 240,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  {
    accessorKey: "role_code",
    header: "Rol",
    sortable: true,
    minWidth: 120,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-[10px] uppercase">{row.original.role_code}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    sortable: true,
    minWidth: 120,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "last_login_at",
    header: "Último login",
    sortable: true,
    minWidth: 130,
    cell: ({ row }) => <RelativeDate iso={row.original.last_login_at} className="text-muted-foreground" />,
  },
];
