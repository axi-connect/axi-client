"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { PRODUCT_KIND_LABELS, type ProductRow } from "@/modules/catalog/domain/product";
import { ProductRowActions } from "@/modules/catalog/ui/tables/product.actions";
import { ProductThumb } from "./ProductThumb";

/**
 * Vista de tarjetas del listado de productos (misma fuente de filas que la
 * tabla). Toda la tarjeta navega al detalle; el menú ⋮ conserva las acciones.
 */
export function ProductGrid({ rows }: { rows: ProductRow[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <li
          key={row.id}
          className="group relative overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-md"
        >
          <Link
            href={`/catalog/products/${row.id}`}
            className="absolute inset-0 z-0"
            aria-label={`Ver ${row.name}`}
          />
          <div className="pointer-events-none relative">
            <ProductThumb
              src={row.image_url}
              alt={`Imagen de ${row.name}`}
              kind={row.kind}
              className="aspect-[4/3] w-full"
              iconClassName="h-8 w-8"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {row.kind === "service" && <Badge variant="secondary">{PRODUCT_KIND_LABELS.service}</Badge>}
              {/* F17: badge de origen — este producto lo gobierna la tienda conectada */}
              {row.governed && <Badge variant="secondary">Shopify</Badge>}
              {!row.is_active && <Badge variant="secondary">Inactivo</Badge>}
              {row.stock_state === "out" && <Badge variant="destructive">Agotado</Badge>}
            </div>
            {/* Nº de fotos que la IA puede enviar (F16); 0 = producto "invisible" para el agente */}
            <span
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground shadow-sm"
              title={row.image_count === 0 ? "Sin fotos: tu agente no podrá mostrar este producto" : undefined}
            >
              <Camera className="size-3" aria-hidden />
              {row.image_count}
            </span>
          </div>
          <div className="relative flex items-start justify-between gap-2 p-3">
            <div className="pointer-events-none min-w-0">
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.kind === "service" && row.duration_minutes
                  ? `${row.duration_minutes} min`
                  : row.category_name !== "—"
                    ? row.category_name
                    : `${row.variant_count} variante${row.variant_count === 1 ? "" : "s"}`}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{row.price_label}</p>
            </div>
            <div className="relative z-10">
              <ProductRowActions product={row} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
