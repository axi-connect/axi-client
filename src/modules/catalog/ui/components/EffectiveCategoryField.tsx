"use client";

import { useMemo, useState } from "react";
import { Check, LoaderCircle, Sparkles, Store, TriangleAlert } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { flattenCategoryTree } from "@/modules/catalog/domain/category";
import {
  effectiveCategoryNote,
  effectiveCategoryState,
  type ProductDTO,
} from "@/modules/catalog/domain/product";
import {
  confirmProductCategory,
  setProductCategory,
} from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";

const NONE = "__none__";
const AUTO = "__auto__";

/**
 * Categoría EFECTIVA del producto (plan catalog_taxonomy_classification, D5):
 * la que usan el agente y la búsqueda. Tres estados y un solo control:
 *  - automática (violeta): la puso el clasificador → «Confirmar» la fija.
 *  - por colección de la tienda (violeta): idem, con la colección como fuente.
 *  - fijada (neutro): la puso o confirmó el tenant.
 * Cambiarla va por su endpoint, no por el PATCH del producto: en un espejo de
 * Shopify la categoría es campo gobernado y aquí se escribe la clasificación.
 */
export function EffectiveCategoryField({
  product,
  canManage,
  onSaved,
  setAlert,
}: {
  product: ProductDTO;
  canManage: boolean;
  onSaved: (updated: ProductDTO) => void;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
}) {
  const { categoryTree } = useCatalog();
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const category = product.effective_category;
  const state = effectiveCategoryState(category);

  const run = async (action: () => Promise<ProductDTO>, success: string) => {
    if (busy) return;
    setBusy(true);
    try {
      onSaved(await action());
      setAlert?.({ variant: "success", title: success });
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo cambiar la categoría") });
    } finally {
      setBusy(false);
    }
  };

  const onChange = (value: string) => {
    if (value === AUTO) {
      void run(() => setProductCategory(product.id, null), "Categoría devuelta al automático");
      return;
    }
    void run(
      () => setProductCategory(product.id, value === NONE ? null : value),
      "Categoría fijada",
    );
  };

  return (
    <div className="space-y-1.5" data-testid="effective-category">
      <span className="text-sm font-medium">Categoría</span>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm",
          state === "fixed" && "border-border",
          (state === "automatic" || state === "external") && "border-dashed border-accent-violet/40",
          state === "none" && "border-dashed border-warning/40",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {state === "fixed" && <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          {state === "automatic" && <Sparkles className="size-4 shrink-0 text-accent-violet" aria-hidden="true" />}
          {state === "external" && <Store className="size-4 shrink-0 text-accent-violet" aria-hidden="true" />}
          {state === "none" && <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />}
          {category ? (
            <span className="min-w-0">
              <span className="font-medium">{category.name}</span>
              <span className="text-muted-foreground"> · {effectiveCategoryNote(category)}</span>
            </span>
          ) : (
            <span>
              <span className="font-medium">Sin categoría</span>
              <span className="text-muted-foreground"> · la clasificación no encontró una que aplique</span>
            </span>
          )}
        </span>
        {canManage && (
          <span className="flex items-center gap-2">
            {(state === "automatic" || state === "external") && (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void run(() => confirmProductCategory(product.id), "Categoría confirmada")}
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
                Confirmar
              </Button>
            )}
            <Select value={category?.id ?? NONE} onValueChange={onChange} disabled={busy}>
              <SelectTrigger className="h-8 w-44 text-xs" aria-label="Cambiar categoría">
                <SelectValue placeholder="Elegir…" />
              </SelectTrigger>
              <SelectContent>
                {state === "fixed" && <SelectItem value={AUTO}>Volver al automático</SelectItem>}
                <SelectItem value={NONE}>Sin categoría</SelectItem>
                {options
                  .filter((option) => option.is_active)
                  .map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {`${"— ".repeat(option.depth)}${option.label}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {state === "fixed"
          ? "La fijaste tú: la clasificación automática no la toca."
          : "Confirmar la fija como tuya. Cambiarla también la fija."}
      </p>
    </div>
  );
}
