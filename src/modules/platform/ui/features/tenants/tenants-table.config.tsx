/**
 * Columnas de la lista de tenants (configuración por datos para el
 * `DataTable` compartido). El mapeo visual vive aquí, no en la vista.
 */
import type { ColumnDef } from "@/shared/components/features/data-table";
import type { TenantListItem } from "../../../domain/tenant";
import { RelativeDate } from "../../components/RelativeDate";
import { StatusBadge } from "../../components/StatusBadge";
import { TenantRowActions } from "./TenantRowActions";

export const tenantColumns: ColumnDef<TenantListItem>[] = [
  {
    accessorKey: "name",
    header: "Empresa",
    sortable: true,
    minWidth: 220,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "nit",
    header: "NIT",
    sortable: true,
    minWidth: 140,
    cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.nit}</span>,
  },
  {
    accessorKey: "status",
    header: "Estado",
    sortable: true,
    searchable: false, // tiene facet propio (valores crudos en inglés)
    minWidth: 130,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "country_code",
    header: "País",
    sortable: true,
    searchable: false, // tiene facet propio
    minWidth: 90,
  },
  {
    accessorKey: "users_count",
    header: "Usuarios",
    sortable: true,
    searchable: false, // conteo: la búsqueda textual no aplica
    minWidth: 100,
    cell: ({ row }) => <span className="tabular-nums">{row.original.users_count}</span>,
  },
  {
    accessorKey: "created_at",
    header: "Creada",
    sortable: true,
    searchable: false, // ISO interna ≠ fecha relativa visible
    minWidth: 120,
    cell: ({ row }) => <RelativeDate iso={row.original.created_at} className="text-muted-foreground" />,
  },
  {
    id: "actions",
    alwaysVisible: true,
    minWidth: 56,
    cell: ({ row }) => <TenantRowActions tenant={row.original} />,
  },
];
