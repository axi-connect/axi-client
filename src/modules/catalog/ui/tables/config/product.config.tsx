"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import {
  aggregateStock,
  PRODUCT_KIND_LABELS,
  PRODUCT_STOCK_LABELS,
  type ProductListItemDTO,
  type ProductRow,
  type ProductStockState,
} from "@/modules/catalog/domain/product";
import { ProductThumb } from "@/modules/catalog/ui/components/ProductThumb";
import { ProductRowActions } from "../product.actions";

const STOCK_DOT_CLASS: Record<ProductStockState, string> = {
  ok: "bg-success",
  low: "bg-warning",
  out: "bg-destructive",
  none: "bg-muted-foreground/40",
};

/** Punto de estado + etiqueta de stock (ok/bajo/agotado; servicios “—”). */
export function ProductStockBadge({ row }: { row: ProductRow }) {
  if (row.stock_state === "none") {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", STOCK_DOT_CLASS[row.stock_state])} aria-hidden />
      <span className="tabular-nums">{row.stock_total}</span>
      <span className="text-muted-foreground">· {PRODUCT_STOCK_LABELS[row.stock_state]}</span>
    </span>
  );
}

/**
 * Nº de fotos vivas del producto (incluye variantes). Con 0, avisa que la IA
 * no podrá "mostrar" el producto — señal accionable para el owner (F16).
 */
export function ProductImageCountBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground/60" tabIndex={0}>
            <Camera className="size-3.5" aria-hidden />
            <span className="tabular-nums text-sm">0</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>Sin fotos: tu agente no podrá mostrar este producto</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Camera className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="tabular-nums text-sm">{count}</span>
    </span>
  );
}

export const productColumns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: "image_url",
    header: "",
    minWidth: 56,
    alwaysVisible: true,
    cell: ({ row }) => (
      <ProductThumb
        src={row.original.image_url}
        alt={`Imagen de ${row.original.name}`}
        kind={row.original.kind}
        className="h-10 w-10 rounded-lg"
      />
    ),
  },
  {
    accessorKey: "name",
    header: "Nombre",
    alwaysVisible: true,
    minWidth: 200,
    cell: ({ row }) => (
      <Link
        href={`/catalog/products/${row.original.id}`}
        className="font-medium transition-colors hover:text-brand"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "kind",
    header: "Tipo",
    minWidth: 100,
    cell: ({ row }) => (
      <Badge variant="secondary">{PRODUCT_KIND_LABELS[row.original.kind]}</Badge>
    ),
  },
  {
    accessorKey: "category_name",
    header: "Categoría",
    minWidth: 140,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.category_name}</span>,
  },
  {
    accessorKey: "price_label",
    header: "Precio",
    minWidth: 110,
    cell: ({ row }) => <span className="tabular-nums">{row.original.price_label}</span>,
  },
  {
    accessorKey: "stock_total",
    header: "Stock",
    minWidth: 140,
    cell: ({ row }) => <ProductStockBadge row={row.original} />,
  },
  {
    accessorKey: "image_count",
    header: "Fotos",
    minWidth: 90,
    cell: ({ row }) => <ProductImageCountBadge count={row.original.image_count} />,
  },
  {
    accessorKey: "is_active",
    header: "Estado",
    minWidth: 100,
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? "default" : "secondary"}>
        {row.original.is_active ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  {
    id: "actions",
    minWidth: 80,
    alwaysVisible: true,
    cell: ({ row }) => <ProductRowActions product={row.original} />,
  },
];

/** Mapea el DTO del listado a la fila plana (categoría resuelta por lookup). */
export function mapProductToRow(
  item: ProductListItemDTO,
  categoryNameById: Map<string, string>,
): ProductRow {
  const stock = aggregateStock(item);
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    image_url: item.image_url,
    category_id: item.category_id,
    category_name: item.category_id ? (categoryNameById.get(item.category_id) ?? "—") : "—",
    price_cents: item.price_cents,
    currency: item.currency,
    price_label: formatMoney(item.price_cents, item.currency),
    variant_count: item.variants.length,
    image_count: item.image_count ?? 0,
    stock_total: stock.total,
    stock_state: stock.state,
    duration_minutes: item.duration_minutes,
    is_active: item.is_active,
    created_at: item.created_at,
  };
}
