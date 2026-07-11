"use client";

import { Badge } from "@/shared/components/ui/badge";
import { formatShortDate } from "@/core/lib/format";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import type { ProductTypeRow } from "@/modules/catalog/domain/product-type";
import { listProductTypes } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import { ProductTypeRowActions } from "../product-type.actions";

export const productTypeColumns: ColumnDef<ProductTypeRow>[] = [
  { accessorKey: "name", header: "Nombre", sortable: true, alwaysVisible: true, minWidth: 180 },
  {
    accessorKey: "description",
    header: "Descripción",
    minWidth: 220,
    cell: ({ row }) => (
      <span className="line-clamp-1 text-muted-foreground">{row.original.description || "—"}</span>
    ),
  },
  {
    accessorKey: "attribute_count",
    header: "Atributos",
    sortable: true,
    minWidth: 110,
    cell: ({ row }) => (
      <Badge variant="secondary" className="tabular-nums">
        {row.original.attribute_count}
      </Badge>
    ),
  },
  {
    accessorKey: "variant_axes_count",
    header: "Ejes de variante",
    minWidth: 130,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{row.original.variant_axes_count}</span>
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
    cell: ({ row }) => <ProductTypeRowActions productType={row.original} />,
  },
];

/** La colección no pagina en el servidor (set pequeño por tenant). */
export async function fetchProductTypes(): Promise<{ rows: ProductTypeRow[]; total: number }> {
  const res = await listProductTypes();
  const rows: ProductTypeRow[] = res.data.map((productType) => ({
    id: productType.id,
    name: productType.name,
    description: productType.description,
    attribute_count: productType.attributes.length,
    variant_axes_count: productType.attributes.filter((attribute) => attribute.scope === "variant").length,
    created_at: productType.created_at,
  }));
  return { rows, total: rows.length };
}
