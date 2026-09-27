import { Camera, Sparkles, Store } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { productStockText, type ProductRow, type ProductStockState } from "@/modules/catalog/domain/product";

/**
 * Las piezas de una fila de producto, compartidas por la tabla y las tarjetas
 * (catálogo premium F2: las dos vistas dicen lo mismo). El color de un estado
 * va en su punto, nunca en el texto (DS §10).
 */

const STOCK_DOT: Record<ProductStockState, string> = {
  ok: "bg-success",
  low: "bg-warning",
  out: "bg-destructive",
  untracked: "bg-muted-foreground/40",
  none: "bg-transparent",
};

/** «24 · disponibles», «11 · 1 variante agotada», «sin control de stock», «no aplica» (servicios). */
export function StockLabel({ row, className }: { row: ProductRow; className?: string }) {
  const { figure, label } = productStockText(row);
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", STOCK_DOT[row.stock_state])} />
      <span>
        {figure !== null ? <span className="font-medium tabular-nums">{figure}</span> : null}
        <span className="text-muted-foreground">
          {figure !== null ? " · " : ""}
          {label}
        </span>
      </span>
    </span>
  );
}

/** La línea bajo el nombre: SKU y variantes de un producto; duración y reserva de un servicio. */
export function ProductMeta({ row }: { row: ProductRow }) {
  if (row.kind === "service") {
    const parts = [
      "Servicio",
      ...(row.duration_minutes !== null ? [`${row.duration_minutes} min`] : []),
      ...(row.requires_booking ? ["requiere reserva"] : []),
    ];
    const text = parts.join(" · ");
    return (
      <span className="truncate text-xs text-muted-foreground" title={text}>
        {text}
      </span>
    );
  }
  const variants = row.variant_count > 1 ? `${row.variant_count} variantes` : null;
  return (
    <span
      className="truncate text-xs text-muted-foreground"
      title={[row.sku, variants].filter((part) => part !== null).join(" · ")}
    >
      {row.sku !== null ? <span className="font-mono">{row.sku}</span> : null}
      {row.variant_count > 1 ? `${row.sku !== null ? " · " : ""}${row.variant_count} variantes` : null}
    </span>
  );
}

/** Origen del producto: lo gobierna la tienda conectada (espejo de Shopify). */
export function GovernedTag() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-muted px-2 text-[11px] font-medium whitespace-nowrap text-foreground/80">
      <Store aria-hidden="true" className="size-3" />
      Shopify
    </span>
  );
}

/** La categoría efectiva con su procedencia («automática · 92 % · por IA»). */
export function CategoryCell({ row }: { row: ProductRow }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        {row.category_is_automatic ? (
          <Sparkles role="img" aria-label="Categoría automática" className="size-3.5 shrink-0 text-accent-violet" />
        ) : null}
        {row.category_missing ? <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" /> : null}
        <span className={cn("truncate", row.category_missing && "text-muted-foreground")} title={row.category_name}>
          {row.category_name}
        </span>
      </span>
      {row.category_note !== "" ? (
        <span className="truncate text-xs text-muted-foreground" title={row.category_note}>
          {row.category_note}
        </span>
      ) : null}
    </span>
  );
}

export const NO_PHOTOS_HINT = "Sin fotos: tu agente no podrá mostrar este producto";

/** Número de fotos; con 0 se atenúa y dice por qué importa (título y texto para lector). */
export function PhotoCount({ count }: { count: number }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 tabular-nums", count === 0 && "text-muted-foreground")}
      title={count === 0 ? NO_PHOTOS_HINT : undefined}
    >
      <Camera aria-hidden="true" className="size-3.5" />
      {count}
      {count === 0 ? <span className="sr-only">. {NO_PHOTOS_HINT}</span> : <span className="sr-only"> fotos</span>}
    </span>
  );
}
