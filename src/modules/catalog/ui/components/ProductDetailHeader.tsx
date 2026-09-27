"use client";

import { Button } from "@/shared/components/ui/button";
import { StatePill } from "@/shared/components/features/bento";
import { formatMoney } from "@/core/lib/format";
import { PRODUCT_KIND_LABELS, productPriceRangeLabel, type ProductDTO } from "@/modules/catalog/domain/product";
import { GovernedTag } from "@/modules/catalog/ui/products/ProductCells";
import { ProductThumb } from "./ProductThumb";

/**
 * Cabecera de la ficha (catálogo premium F3, canvas tablero 4): la foto, el
 * estado y el tipo como píldoras, el nombre como `h1` de la vista, y en una
 * línea el precio (rango de las variantes), el catálogo y la categoría
 * EFECTIVA —la misma que muestra Información; antes esta línea leía
 * `category_id` y podían no coincidir—. Acciones: desactivar/activar y
 * eliminar, con los permisos de siempre.
 */
export function ProductDetailHeader({
  product,
  catalogName,
  categoryName,
  canManage,
  toggling,
  onToggleActive,
  onDelete,
}: {
  product: ProductDTO;
  catalogName: string | null;
  categoryName: string | null;
  canManage: boolean;
  toggling: boolean;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const variants = product.variants.filter((variant) => variant.is_active).length;
  const service =
    product.kind === "service" && product.duration_minutes !== null
      ? [
          `${product.duration_minutes} min`,
          ...(product.buffer_minutes ? [`buffer ${product.buffer_minutes} min`] : []),
          ...(product.requires_booking ? ["requiere reserva"] : []),
        ].join(" · ")
      : null;
  const context = [catalogName, categoryName, service].filter((part): part is string => Boolean(part));

  return (
    <header id="ficha" className="flex scroll-mt-24 flex-col gap-5 sm:flex-row sm:items-center">
      <ProductThumb
        src={product.image_url}
        alt={`Imagen de ${product.name}`}
        kind={product.kind}
        className="size-20 shrink-0 rounded-[22px] sm:size-28"
        iconClassName="h-9 w-9"
        sizes="112px"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatePill tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "Activo" : "Inactivo"}</StatePill>
          <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium">
            {PRODUCT_KIND_LABELS[product.kind]}
          </span>
          {variants > 1 ? (
            <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium">
              {variants} variantes
            </span>
          ) : null}
          {product.governed_by_connection_id !== null ? <GovernedTag /> : null}
        </div>
        <h1 className="font-heading text-[1.75rem] leading-[1.08] font-bold tracking-tight text-balance break-words sm:text-[2.25rem]">
          {product.name}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
            {productPriceRangeLabel(product, formatMoney)}{" "}
            <span className="font-normal text-muted-foreground">{product.currency}</span>
          </span>
          {context.map((part) => (
            <span key={part} className="inline-flex items-center gap-2">
              <span aria-hidden="true">·</span>
              <span>{part}</span>
            </span>
          ))}
        </p>
      </div>
      {canManage && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="rounded-full" disabled={toggling} onClick={onToggleActive}>
            {toggling ? "Guardando…" : product.is_active ? "Desactivar" : "Activar"}
          </Button>
          {/* Destructivo ≠ coral (DESIGN §8): contorno rojo, no el botón relleno. */}
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            Eliminar
          </Button>
        </div>
      )}
    </header>
  );
}
