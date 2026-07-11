"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatMoney } from "@/core/lib/format";
import { PRODUCT_KIND_LABELS, type ProductDTO } from "@/modules/catalog/domain/product";
import { ProductThumb } from "./ProductThumb";

/**
 * Cabecera del detalle: imagen, nombre, badges de estado/kind, contexto
 * (catálogo · categoría) y acciones destructivas (desactivar / eliminar).
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
  const context = [catalogName, categoryName].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <ProductThumb
        src={product.image_url}
        alt={`Imagen de ${product.name}`}
        kind={product.kind}
        className="h-24 w-24 shrink-0 rounded-2xl"
        iconClassName="h-8 w-8"
        sizes="96px"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{product.name}</h2>
          <Badge variant={product.is_active ? "default" : "secondary"}>
            {product.is_active ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant="secondary">{PRODUCT_KIND_LABELS[product.kind]}</Badge>
        </div>
        {context && <p className="mt-0.5 text-sm text-muted-foreground">{context}</p>}
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {formatMoney(product.price_cents, product.currency)}{" "}
          <span className="text-sm font-normal text-muted-foreground">{product.currency}</span>
        </p>
        {product.kind === "service" && product.duration_minutes !== null && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {product.duration_minutes} min
            {product.buffer_minutes ? ` · buffer ${product.buffer_minutes} min` : ""}
            {product.requires_booking ? " · requiere reserva" : ""}
          </p>
        )}
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" disabled={toggling} onClick={onToggleActive}>
            {toggling ? "Guardando…" : product.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      )}
    </div>
  );
}
