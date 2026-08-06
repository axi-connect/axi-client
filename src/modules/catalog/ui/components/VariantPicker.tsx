"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import type {
  ProductListItemDTO,
  ProductVariantDTO,
} from "@/modules/catalog/domain/product";
import {
  getProductById,
  listProducts,
} from "@/modules/catalog/infrastructure/services/product-service.adapter";

const SEARCH_DEBOUNCE_MS = 300;

export type VariantSelection = {
  variant_id: string;
  /** Texto ya compuesto para mostrar ("Camiseta básica · Talla M"). */
  label: string;
};

/**
 * Selector de variante del catálogo en DOS PASOS: producto → variante.
 *
 * No existe un endpoint de variantes planas: `GET /catalog/products?q=` busca
 * productos y las variantes solo llegan embebidas en `GET /catalog/products/:id`.
 * Por eso el segundo paso carga el producto completo al elegirlo, en vez de
 * poder filtrar variantes directamente.
 *
 * Solo ofrece variantes ACTIVAS: regalar una variante desactivada crearía un
 * pedido con una línea que el catálogo ya no vende.
 */
export function VariantPicker({
  value,
  onChange,
  error,
  disabled,
}: {
  value: VariantSelection | null;
  onChange: (selection: VariantSelection | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductListItemDTO[]>([]);
  const [searching, setSearching] = useState(false);

  /** Producto abierto en el segundo paso; `null` = estamos en el primero. */
  const [picked, setPicked] = useState<{
    name: string;
    variants: ProductVariantDTO[];
  } | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    if (!open || picked !== null) return;
    setSearching(true);
    const timer = window.setTimeout(() => {
      listProducts({ q: query.trim() || undefined, is_active: true, page_size: 10 })
        .then((res) => setProducts(res.data))
        .catch(() => setProducts([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, query, picked]);

  // Al cerrar se vuelve al primer paso: reabrir en "elige variante" sin saber
  // de qué producto era resulta desorientador.
  useEffect(() => {
    if (!open) {
      setPicked(null);
      setQuery("");
    }
  }, [open]);

  async function openProduct(product: ProductListItemDTO) {
    setLoadingVariants(true);
    try {
      const full = await getProductById(product.id);
      const variants = full.variants.filter((v) => v.is_active);
      if (variants.length === 1) {
        // Un producto sin ejes de variación tiene una sola variante: obligar a
        // un segundo clic para elegir "la única" es fricción sin información.
        onChange({
          variant_id: variants[0].id,
          label: variantLabel(full.name, variants[0]),
        });
        setOpen(false);
        return;
      }
      setPicked({ name: full.name, variants });
    } catch {
      setPicked({ name: product.name, variants: [] });
    } finally {
      setLoadingVariants(false);
    }
  }

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-9 w-full justify-between font-normal",
              value === null && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <span className="truncate">{value?.label ?? "Buscar en tu catálogo…"}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          {picked === null ? (
            <Command shouldFilter={false}>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Nombre o SKU del producto…"
              />
              <CommandList>
                <CommandEmpty>
                  {searching ? "Buscando…" : "Ningún producto coincide"}
                </CommandEmpty>
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => void openProduct(product)}
                  >
                    <span className="min-w-0 flex-1 truncate">{product.name}</span>
                    {loadingVariants ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <span className="text-xs text-muted-foreground">Elegir</span>
                    )}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          ) : (
            <div>
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPicked(null)}
                >
                  ← Volver
                </Button>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {picked.name}
                </span>
              </div>
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandEmpty>Este producto no tiene variantes activas</CommandEmpty>
                  {picked.variants.map((variant) => {
                    const label = variantLabel(picked.name, variant);
                    return (
                      <CommandItem
                        key={variant.id}
                        value={variant.id}
                        onSelect={() => {
                          onChange({ variant_id: variant.id, label });
                          setOpen(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {variant.name ?? "Única"}
                        </span>
                        {variant.sku && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {variant.sku}
                          </span>
                        )}
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatMoney(variant.price_cents)}
                        </span>
                        {value?.variant_id === variant.id && (
                          <Check className="size-4" aria-hidden />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandList>
              </Command>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** "Camiseta básica · Talla M" — producto y variante, que por separado no
 *  identifican nada en una lista de promociones. */
export function variantLabel(productName: string, variant: ProductVariantDTO): string {
  return variant.name ? `${productName} · ${variant.name}` : productName;
}
