"use client";

/**
 * Buscador de productos del catálogo del tenant para fijar la etiqueta
 * esperada (búsqueda y reconocimiento). Debounce de 300 ms; muestra sku,
 * nombre y categoría; el elegido se marca.
 */
import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import type { TenantCatalogProduct } from "../../../../../domain/quality-datasets";
import { useTenantCatalogSearch } from "../../../../../infrastructure/api/hooks/use-tenant-lookup";

type ProductPickerProps = {
  companyId: string;
  selectedIds: readonly string[];
  onPick: (product: TenantCatalogProduct) => void;
  placeholder?: string;
};

export function ProductPicker({ companyId, selectedIds, onPick, placeholder }: ProductPickerProps) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const search = useTenantCatalogSearch(companyId, debounced);
  const results = search.data ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? "Buscar otro producto del catálogo…"}
          className="pl-8"
          aria-label="Buscar producto del catálogo"
          autoComplete="off"
        />
      </div>
      {debounced.trim().length > 0 && (
        <ul className="max-h-56 space-y-1 overflow-y-auto" aria-label="Resultados del catálogo">
          {search.isPending && <li className="px-2 py-1 text-xs text-muted-foreground">Buscando…</li>}
          {!search.isPending && results.length === 0 && (
            <li className="px-2 py-1 text-xs text-muted-foreground">Sin resultados para «{debounced}».</li>
          )}
          {results.map((product) => {
            const picked = selectedIds.includes(product.product_id);
            return (
              <li key={product.product_id}>
                <button
                  type="button"
                  onClick={() => onPick(product)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                    picked ? "border-brand bg-accent" : "border-border",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{product.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono">{product.sku || "—"}</span>
                      {product.category_path ? ` · ${product.category_path}` : ""}
                      {!product.available ? " · agotado" : ""}
                    </span>
                  </span>
                  {picked && <Check aria-hidden="true" className="size-4 shrink-0 text-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
