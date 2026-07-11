"use client";

import { formatShortDate } from "@/core/lib/format";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import type { CatalogRow } from "@/modules/catalog/domain/catalog";
import { listCatalogs } from "@/modules/catalog/infrastructure/services/catalog-service.adapter";
import { CatalogRowActions } from "../catalog.actions";

export const catalogColumns: ColumnDef<CatalogRow>[] = [
  { accessorKey: "name", header: "Nombre", sortable: true, alwaysVisible: true, minWidth: 180 },
  {
    accessorKey: "code",
    header: "Código",
    sortable: true,
    minWidth: 120,
    cell: ({ row }) => (
      <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">{row.original.code}</code>
    ),
  },
  {
    accessorKey: "description",
    header: "Descripción",
    minWidth: 220,
    cell: ({ row }) => (
      <span className="line-clamp-1 text-muted-foreground">{row.original.description || "—"}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Creado",
    sortable: true,
    minWidth: 110,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{formatShortDate(row.original.created_at)}</span>
    ),
  },
  {
    id: "actions",
    minWidth: 80,
    alwaysVisible: true,
    cell: ({ row }) => <CatalogRowActions catalog={row.original} />,
  },
];

/** La colección no pagina en el servidor (set pequeño por tenant). */
export async function fetchCatalogs(): Promise<{ rows: CatalogRow[]; total: number }> {
  const res = await listCatalogs();
  const rows: CatalogRow[] = res.data.map((catalog) => ({
    id: catalog.id,
    name: catalog.name,
    code: catalog.code,
    description: catalog.description,
    created_at: catalog.created_at,
  }));
  return { rows, total: rows.length };
}
