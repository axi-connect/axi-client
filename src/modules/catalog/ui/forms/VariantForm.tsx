"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { errorMessage } from "@/core/lib/error-messages";
import {
  attributeOptions,
  type ProductTypeAttributeDTO,
} from "@/modules/catalog/domain/product-type";
import type { ProductVariantDTO, UpsertVariantDTO } from "@/modules/catalog/domain/product";
import {
  createVariant,
  updateVariant,
} from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { PriceInput } from "@/modules/catalog/ui/components/PriceInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const UNSET_OPTION = "__unset__";

type VariantAttributeMap = Record<string, string | number | boolean>;

/**
 * Crear/editar una variante existente (modal del detalle de producto).
 * ⚠️ El PATCH de variante devuelve `{status}`, no el producto: el host debe
 * re-fetch (`onSaved` se invoca sin datos en edición).
 */
export function VariantForm({
  productId,
  variant,
  axes,
  isService,
  currency,
  onSaved,
  onCancel,
  setAlert,
}: {
  productId: string;
  /** Presente en edición; ausente al crear. */
  variant?: ProductVariantDTO;
  axes: ProductTypeAttributeDTO[];
  isService: boolean;
  currency: string;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
}) {
  const isEdit = Boolean(variant);
  const [sku, setSku] = useState(variant?.sku ?? "");
  const [name, setName] = useState(variant?.name ?? "");
  const [isDefault, setIsDefault] = useState(variant?.is_default ?? false);
  const [isActive, setIsActive] = useState(variant?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  // En las respuestas el precio de variante llega YA resuelto (propio o
  // heredado): al editar no podemos distinguirlo, así que se parte del
  // resuelto y el usuario decide si lo cambia.
  const [priceCents, setPriceCents] = useState<number | null>(variant?.price_cents ?? null);
  // Import por URL (F16): al guardar, el backend descarga la imagen en un job
  // asíncrono y la añade a la galería de la variante (status pending → ready).
  const [imageUrl, setImageUrl] = useState("");
  const [attributes, setAttributes] = useState<VariantAttributeMap>(() => {
    const initial: VariantAttributeMap = {};
    for (const [code, value] of Object.entries(variant?.attributes ?? {})) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        initial[code] = value;
      }
    }
    return initial;
  });

  const variantAxes = useMemo(() => axes.filter((axis) => axis.scope === "variant"), [axes]);

  const setAttribute = (code: string, value: string | number | boolean | undefined) => {
    setAttributes((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete next[code];
      } else {
        next[code] = value;
      }
      return next;
    });
  };

  const submit = async () => {
    const trimmedSku = sku.trim();
    if (!trimmedSku) {
      setSkuError("SKU requerido");
      return;
    }
    if (trimmedSku.length > 64) {
      setSkuError("Máximo 64 caracteres");
      return;
    }
    setSkuError(null);

    const dto: UpsertVariantDTO = {
      sku: trimmedSku,
      ...(name.trim() ? { name: name.trim() } : {}),
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      price_cents: priceCents,
      is_default: isDefault,
      is_active: isActive,
      ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
    };

    try {
      setSubmitting(true);
      if (isEdit && variant) {
        await updateVariant(variant.id, dto);
      } else {
        await createVariant(productId, dto);
      }
      setAlert?.({ variant: "success", title: isEdit ? "Variante actualizada" : "Variante creada" });
      await onSaved();
    } catch (err) {
      setAlert?.({
        variant: "destructive",
        title: errorMessage(err, isEdit ? "No se pudo actualizar la variante" : "No se pudo crear la variante"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="variant-sku">SKU</Label>
          <Input
            id="variant-sku"
            value={sku}
            maxLength={64}
            placeholder="CAM-R-M"
            className="font-mono"
            aria-invalid={Boolean(skuError)}
            onChange={(e) => setSku(e.target.value)}
          />
          {skuError && <p className="text-xs text-destructive">{skuError}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="variant-name">Nombre</Label>
          <Input
            id="variant-name"
            value={name}
            maxLength={120}
            placeholder="Roja · M (opcional)"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="variant-price">Precio</Label>
          <PriceInput
            id="variant-price"
            value={priceCents}
            currency={currency}
            placeholder="Hereda el precio base"
            onChange={setPriceCents}
          />
          <p className="text-xs text-muted-foreground">Vacío = hereda el precio base del producto</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="variant-image-url">Imagen (URL)</Label>
          <Input
            id="variant-image-url"
            type="url"
            value={imageUrl}
            placeholder="https://…/variante.jpg"
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            La descargaremos y la serviremos desde axi para que siempre cargue rápido
          </p>
        </div>

        {variantAxes.map((axis) => {
          const inputId = `variant-axis-${axis.code}`;
          const value = attributes[axis.code];
          return (
            <div key={axis.code} className="space-y-1.5">
              <Label htmlFor={inputId}>
                {axis.label}
                {axis.unit ? <span className="text-muted-foreground"> ({axis.unit})</span> : null}
              </Label>
              {axis.type === "select" ? (
                <Select
                  value={value === undefined ? UNSET_OPTION : String(value)}
                  onValueChange={(v: string) => setAttribute(axis.code, v === UNSET_OPTION ? undefined : v)}
                >
                  <SelectTrigger id={inputId} className="w-full">
                    <SelectValue placeholder="Sin definir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET_OPTION}>Sin definir</SelectItem>
                    {attributeOptions(axis).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : axis.type === "boolean" ? (
                <label className="flex h-9 items-center gap-2 text-sm">
                  <input
                    id={inputId}
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={value === true}
                    onChange={(e) => setAttribute(axis.code, e.target.checked)}
                  />
                  Sí
                </label>
              ) : (
                <Input
                  id={inputId}
                  type={axis.type === "number" ? "number" : "text"}
                  inputMode={axis.type === "number" ? "decimal" : undefined}
                  value={value === undefined ? "" : String(value)}
                  onChange={(e) =>
                    setAttribute(
                      axis.code,
                      e.target.value === ""
                        ? undefined
                        : axis.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} aria-label="Variante por defecto" />
          Variante por defecto
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Variante activa" />
          Activa
        </label>
      </div>

      {!isService && !isEdit && (
        <p className="text-xs text-muted-foreground">
          El stock inicial es 0: ajústalo desde la tabla tras crear la variante.
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear variante"}
        </Button>
      </div>
    </div>
  );
}
