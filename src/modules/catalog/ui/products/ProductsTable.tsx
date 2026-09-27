"use client";

import Link from "next/link";
import { cn } from "@/core/lib/utils";
import { StatePill } from "@/shared/components/features/bento";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import type { ProductRow } from "@/modules/catalog/domain/product";
import { ProductThumb } from "@/modules/catalog/ui/components/ProductThumb";
import { ProductRowActions } from "@/modules/catalog/ui/tables/product.actions";
import { CategoryCell, GovernedTag, PhotoCount, ProductMeta, StockLabel } from "./ProductCells";

const TH = "h-11 px-3 text-xs font-medium text-muted-foreground first:pl-5 last:pr-4";
const TD = "px-3 py-3 first:pl-5 last:pr-4";

/**
 * La tabla del listado (catálogo premium, canvas tablero 1). Vive en una
 * tarjeta `@container` del contenedor padre: las columnas secundarias
 * aparecen según el ancho de la TABLA, no de la pantalla (DS §9 «Tablas y
 * scroll»). Con la tabla estrecha, precio y stock suben a la primera columna y
 * nada se pierde; si aun así no cabe, scrollea dentro de su tarjeta.
 */
export function ProductsTable({ rows, busy }: { rows: ProductRow[]; busy: boolean }) {
  return (
    <Table className="text-[13.5px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={TH}>Producto</TableHead>
          <TableHead className={cn(TH, "hidden @3xl:table-cell")}>Categoría</TableHead>
          <TableHead className={cn(TH, "hidden text-right @xl:table-cell")}>Precio</TableHead>
          <TableHead className={cn(TH, "hidden @xl:table-cell")}>Stock</TableHead>
          <TableHead className={cn(TH, "hidden @4xl:table-cell")}>Fotos</TableHead>
          <TableHead className={cn(TH, "hidden @2xl:table-cell")}>Estado</TableHead>
          <TableHead className={TH}>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody aria-busy={busy || undefined} className={cn("transition-opacity duration-200", busy && "opacity-60")}>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className={cn(TD, "max-w-0 @md:min-w-60 w-full @3xl:w-auto @3xl:max-w-80")}>
              <Link
                href={`/catalog/products/${row.id}`}
                className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ProductThumb
                  src={row.image_url}
                  alt={`Imagen de ${row.name}`}
                  kind={row.kind}
                  className="size-11 shrink-0 rounded-xl"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold" title={row.name}>
                    {row.name}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <ProductMeta row={row} />
                    {row.governed ? <GovernedTag /> : null}
                    {!row.is_active ? (
                      <span className="text-xs whitespace-nowrap text-muted-foreground @2xl:hidden">· Inactivo</span>
                    ) : null}
                  </span>
                  {/* Tabla estrecha: precio y stock suben aquí en vez de desaparecer. */}
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs @xl:hidden">
                    <span className="font-medium whitespace-nowrap tabular-nums">{row.price_range_label}</span>
                    <StockLabel row={row} />
                  </span>
                </span>
              </Link>
            </TableCell>
            <TableCell className={cn(TD, "hidden max-w-56 @3xl:table-cell")}>
              <CategoryCell row={row} />
            </TableCell>
            <TableCell className={cn(TD, "hidden text-right font-medium whitespace-nowrap tabular-nums @xl:table-cell")}>
              {row.price_range_label}
            </TableCell>
            <TableCell className={cn(TD, "hidden @xl:table-cell")}>
              <StockLabel row={row} />
            </TableCell>
            <TableCell className={cn(TD, "hidden @4xl:table-cell")}>
              <PhotoCount count={row.image_count} />
            </TableCell>
            <TableCell className={cn(TD, "hidden @2xl:table-cell")}>
              <StatePill tone={row.is_active ? "success" : "neutral"}>{row.is_active ? "Activo" : "Inactivo"}</StatePill>
            </TableCell>
            <TableCell className={cn(TD, "w-12")}>
              <ProductRowActions product={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
