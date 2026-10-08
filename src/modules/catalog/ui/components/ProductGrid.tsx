import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { ProductRow } from "@/modules/catalog/domain/product";
import { ProductThumb } from "@/modules/catalog/ui/components/ProductThumb";
import { ProductRowActions } from "@/modules/catalog/ui/tables/product.actions";
import { GovernedTag, NO_PHOTOS_HINT, PhotoCount, StockLabel } from "@/modules/catalog/ui/products/ProductCells";

const CHIP =
  "inline-flex h-6 items-center gap-1.5 rounded-full bg-card/85 px-2.5 text-[11.5px] font-medium whitespace-nowrap shadow-[0_0_0_1px_var(--border)] backdrop-blur";

/**
 * Vista de tarjetas del listado (catálogo premium, canvas tablero 3). Dice lo
 * mismo que la tabla: stock con su punto, fotos, origen de la tienda, servicio
 * con su duración. Toda la tarjeta enlaza al detalle; el menú de acciones va
 * por encima del enlace. Sin fotos, la imagen lo dice y ofrece subirlas.
 */
export function ProductGrid({ rows, busy = false, canManage }: { rows: ProductRow[]; busy?: boolean; canManage: boolean }) {
  return (
    <ul
      aria-busy={busy || undefined}
      className={cn(
        "grid grid-cols-1 gap-4 transition-opacity duration-200 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4",
        busy && "opacity-60",
      )}
    >
      {rows.map((row) => {
        const noPhotos = row.image_count === 0;
        const line =
          row.kind === "service"
            ? ["Servicio", ...(row.duration_minutes !== null ? [`${row.duration_minutes} min`] : [])].join(" · ")
            : [
                row.category_missing ? "Sin categoría" : row.category_name,
                ...(row.variant_count > 1 ? [`${row.variant_count} variantes`] : []),
              ].join(" · ");
        return (
          <li
            key={row.id}
            className="group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-border bg-card transition-shadow hover:shadow-md"
          >
            <Link
              href={`/catalog/products/${row.id}`}
              aria-label={`Ver ${row.name}`}
              className="absolute inset-0 z-0 rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            {/* La imagen deja pasar el clic al enlace de la tarjeta; solo «Subir fotos» lo captura. */}
            <div className="pointer-events-none relative aspect-[4/3]">
              {noPhotos ? (
                <div className="absolute inset-2.5 flex flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-foreground/15 text-xs text-muted-foreground">
                  <ImagePlus aria-hidden="true" className="size-6" />
                  <span className="font-medium text-foreground/80">Sin fotos</span>
                  <span className="sr-only">{NO_PHOTOS_HINT}</span>
                  {canManage ? (
                    <Link
                      href={`/catalog/products/${row.id}#fotos`}
                      className="pointer-events-auto relative z-10 inline-flex min-h-6 items-center font-medium text-foreground underline underline-offset-3"
                    >
                      Subir fotos
                    </Link>
                  ) : null}
                </div>
              ) : (
                <ProductThumb
                  src={row.thumb_url}
                  alt={`Imagen de ${row.name}`}
                  kind={row.kind}
                  className="h-full w-full"
                  iconClassName="h-8 w-8"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              )}
              <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                {row.kind === "service" ? <span className={CHIP}>Servicio</span> : null}
                {row.governed ? <GovernedTag /> : null}
                {!row.is_active ? (
                  <span className={CHIP}>
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground" />
                    Inactivo
                  </span>
                ) : null}
              </div>
              {!noPhotos ? (
                <span className={cn(CHIP, "absolute right-2.5 bottom-2.5")}>
                  <PhotoCount count={row.image_count} />
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1 px-4 pt-3 pb-3.5">
              <span className="truncate text-sm font-semibold" title={row.name}>
                {row.name}
              </span>
              <span className="truncate text-xs text-muted-foreground" title={line}>
                {line}
              </span>
              <span className="mt-1.5 text-sm font-semibold whitespace-nowrap tabular-nums">{row.price_range_label}</span>
              <StockLabel row={row} className="text-xs" />
            </div>
            <div className="absolute top-2 right-2 z-10 rounded-full bg-card/85 backdrop-blur">
              <ProductRowActions product={row} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
