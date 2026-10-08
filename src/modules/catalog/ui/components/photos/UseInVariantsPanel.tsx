"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/core/lib/utils";
import type { ProductDTO, ProductImageDTO } from "@/modules/catalog/domain/product";
import {
  canUseImageForVariant,
  currentUseLabel,
  effectiveVariantPrimary,
  variantAssignments,
  variantGroupShortcuts,
  type VariantAssignment,
  type VariantChoice,
} from "@/modules/catalog/domain/product-gallery";
import { AnchoredPanel } from "./AnchoredPanel";
import { useProductGallery } from "./product-gallery.context";

/**
 * «Usar en variante…» (lienzo, artboard 2): una foto, todas las variantes. Cada
 * fila dice qué usa hoy y qué cambiará; los atajos marcan un grupo («Todo
 * Negro») y «Guardar» manda solo lo que cambia, en UN guardado todo-o-nada.
 */
export function UseInVariantsPanel({
  product,
  image,
  open,
  onOpenChange,
  onSave,
}: {
  product: ProductDTO;
  image: ProductImageDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (assignments: VariantAssignment[]) => Promise<void>;
}) {
  return (
    <AnchoredPanel
      open={open && image !== null}
      onOpenChange={onOpenChange}
      anchorSelector={image ? `[data-photo-id="${image.id}"]` : null}
      title="Usar como principal de…"
    >
      {image !== null ? (
        // key: cada foto abre el panel con su propio estado inicial
        <PanelBody key={image.id} product={product} image={image} onClose={() => onOpenChange(false)} onSave={onSave} />
      ) : null}
    </AnchoredPanel>
  );
}

/** Marcada de entrada solo si ESA variante la usa por sí misma; heredar la del producto no cuenta. */
function usesAsOwnChoice(current: { image: { id: string } | null; source: string }, imageId: string): boolean {
  return current.image?.id === imageId && current.source !== "product";
}

function PanelBody({
  product,
  image,
  onClose,
  onSave,
}: {
  product: ProductDTO;
  image: ProductImageDTO;
  onClose: () => void;
  onSave: (assignments: VariantAssignment[]) => Promise<void>;
}) {
  const { labelOf } = useProductGallery();
  const images = useMemo(() => product.images ?? [], [product.images]);
  const variants = useMemo(() => [...product.variants].sort((a, b) => a.position - b.position), [product.variants]);
  const initial = useMemo(
    () =>
      new Map<string, VariantChoice>(
        variants.map((variant) => [
          variant.id,
          usesAsOwnChoice(effectiveVariantPrimary(images, variant, product.primary_image_id), image.id)
            ? "this"
            : "keep",
        ]),
      ),
    [variants, images, product.primary_image_id, image.id],
  );
  const [choices, setChoices] = useState(initial);
  const [saving, setSaving] = useState(false);

  const assignments = variantAssignments(product, image.id, choices);
  const shortcuts = variantGroupShortcuts(variants.filter((variant) => canUseImageForVariant(image, variant.id)));
  const imageLabel = image.alt_text ? `«${image.alt_text}»` : "Esta foto";
  const ownerLabel =
    image.variant_id === null
      ? "foto general"
      : `foto de ${labelOf(variants.find((variant) => variant.id === image.variant_id) ?? { attributes: {}, name: null, sku: "" })}`;

  const set = (variantId: string, choice: VariantChoice) =>
    setChoices((current) => new Map(current).set(variantId, choice));

  const toggleGroup = (ids: readonly string[]) =>
    setChoices((current) => {
      const allOn = ids.every((id) => current.get(id) === "this");
      const next = new Map(current);
      for (const id of ids) next.set(id, allOn ? "keep" : "this");
      return next;
    });

  const save = async () => {
    if (assignments.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSave(assignments);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">Usar como principal de…</p>
          <p className="truncate text-xs text-muted-foreground">
            {imageLabel} · {ownerLabel}
          </p>
        </div>
      </div>

      {shortcuts.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
          <span className="text-xs text-muted-foreground">Marcar:</span>
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => toggleGroup(shortcut.variant_ids)}
              className="inline-flex min-h-7 items-center rounded-full border border-border px-2.5 text-xs font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="max-h-[22rem] overflow-y-auto px-2" aria-label="Variantes">
        {variants.map((variant) => {
          const eligible = canUseImageForVariant(image, variant.id);
          const choice = choices.get(variant.id) ?? "keep";
          const changed = choice !== initial.get(variant.id) || choice === "product";
          const current = effectiveVariantPrimary(images, variant, product.primary_image_id);
          const label = labelOf(variant);
          const inputId = `use-${image.id}-${variant.id}`;
          const now = currentUseLabel(product, variant, image.id);
          return (
            <li
              key={variant.id}
              className={cn(
                "flex items-center gap-3 border-b border-border/60 px-2 py-2 last:border-b-0",
                !eligible && "opacity-55",
              )}
            >
              <Checkbox
                id={inputId}
                touchTarget
                checked={choice === "this"}
                disabled={!eligible}
                onChange={(event) => set(variant.id, event.target.checked ? "this" : "keep")}
              />
              {current.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.image.url}
                  alt=""
                  className={cn("size-9 shrink-0 rounded-lg object-cover", current.source === "product" && "opacity-60")}
                />
              ) : (
                <span className="size-9 shrink-0 rounded-lg bg-muted" aria-hidden />
              )}
              <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
                <span className="block truncate text-sm font-medium">{label}</span>
                <span className={cn("block truncate text-xs", changed ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {!eligible
                    ? "Es foto de otra variante"
                    : choice === "this" && changed
                      ? "Pasará a usar esta foto"
                      : choice === "product"
                        ? "Pasará a usar la del producto"
                        : `Ahora: ${now}`}
                </span>
              </label>
              {eligible && current.source !== "product" && choice !== "this" && choice !== "product" ? (
                <button
                  type="button"
                  onClick={() => set(variant.id, "product")}
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Usar la del producto
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {assignments.length === 0 ? "Sin cambios" : `${assignments.length} ${assignments.length === 1 ? "cambio" : "cambios"}`}
        </span>
        <span className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full px-4"
            disabled={saving || assignments.length === 0}
            onClick={() => void save()}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </span>
      </div>
    </div>
  );
}
