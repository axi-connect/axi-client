"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { errorMessage } from "@/core/lib/error-messages";
import {
  attributeOptions,
  type ProductTypeAttributeDTO,
  type ProductTypeDTO,
} from "@/modules/catalog/domain/product-type";
import type { ProductDTO } from "@/modules/catalog/domain/product";
import { setProductAttributeValues } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const UNSET_OPTION = "__unset__";

type AttributeValueMap = Record<string, string | number | boolean>;

function initialValues(product: ProductDTO): AttributeValueMap {
  const values: AttributeValueMap = {};
  for (const attributeValue of product.attribute_values) {
    if (attributeValue.value !== null) values[attributeValue.code] = attributeValue.value;
  }
  return values;
}

/**
 * Atributos EAV ámbito producto, generados desde el attribute set del tipo.
 * Guardar envía el record COMPLETO (`PUT .../attribute-values`, replace-set);
 * el backend exige los atributos requeridos.
 */
export function ProductAttributesSection({
  product,
  productType,
  canManage,
  highlightRequired,
  onSaved,
  setAlert,
}: {
  product: ProductDTO;
  productType: ProductTypeDTO;
  canManage: boolean;
  /** true cuando se llega desde crear con atributos requeridos pendientes. */
  highlightRequired?: boolean;
  onSaved: (updated: ProductDTO) => void;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
}) {
  const [values, setValues] = useState<AttributeValueMap>(() => initialValues(product));
  const [saving, setSaving] = useState(false);

  // Re-sincroniza cuando el producto se re-fetchea (p. ej. tras editar variantes).
  useEffect(() => {
    setValues(initialValues(product));
  }, [product]);

  const productAttributes = useMemo(
    () =>
      [...productType.attributes]
        .filter((attribute) => attribute.scope === "product")
        .sort((a, b) => a.position - b.position),
    [productType.attributes],
  );

  if (productAttributes.length === 0) return null;

  const setValue = (code: string, value: string | number | boolean | undefined) => {
    setValues((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete next[code];
      } else {
        next[code] = value;
      }
      return next;
    });
  };

  const missingRequired = productAttributes
    .filter((attribute) => attribute.is_required && values[attribute.code] === undefined)
    .map((attribute) => attribute.label);

  const save = async () => {
    if (missingRequired.length > 0) {
      setAlert?.({
        variant: "destructive",
        title: `Completa los atributos requeridos: ${missingRequired.join(", ")}`,
      });
      return;
    }
    try {
      setSaving(true);
      const updated = await setProductAttributeValues(product.id, { values });
      setAlert?.({ variant: "success", title: "Atributos guardados correctamente" });
      onSaved(updated);
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudieron guardar los atributos") });
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (attribute: ProductTypeAttributeDTO) => {
    const inputId = `product-attr-${attribute.code}`;
    const value = values[attribute.code];
    const missing = highlightRequired && attribute.is_required && value === undefined;

    if (attribute.type === "select") {
      return (
        <Select
          value={value === undefined ? UNSET_OPTION : String(value)}
          onValueChange={(v: string) => setValue(attribute.code, v === UNSET_OPTION ? undefined : v)}
        >
          <SelectTrigger id={inputId} className="w-full" disabled={!canManage} aria-invalid={missing}>
            <SelectValue placeholder="Sin definir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET_OPTION}>Sin definir</SelectItem>
            {attributeOptions(attribute).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (attribute.type === "boolean") {
      return (
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            id={inputId}
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={value === true}
            disabled={!canManage}
            onChange={(e) => setValue(attribute.code, e.target.checked)}
          />
          Sí
        </label>
      );
    }
    if (attribute.type === "number") {
      return (
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={value === undefined ? "" : String(value)}
          disabled={!canManage}
          aria-invalid={missing}
          className="tabular-nums"
          onChange={(e) => setValue(attribute.code, e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    }
    return (
      <Input
        id={inputId}
        value={value === undefined ? "" : String(value)}
        disabled={!canManage}
        maxLength={120}
        aria-invalid={missing}
        onChange={(e) => setValue(attribute.code, e.target.value)}
      />
    );
  };

  return (
    <section className="space-y-4" aria-label="Atributos del producto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Atributos ({productType.name})</h3>
          {highlightRequired && missingRequired.length > 0 && (
            <p className="text-sm text-warning">
              Faltan atributos requeridos: {missingRequired.join(", ")}
            </p>
          )}
        </div>
        {canManage && (
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar atributos"}
          </Button>
        )}
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productAttributes.map((attribute) => (
          <div key={attribute.code} className="space-y-1.5">
            <Label htmlFor={`product-attr-${attribute.code}`}>
              {attribute.label}
              {attribute.is_required && <span className="text-destructive"> *</span>}
              {attribute.unit ? <span className="text-muted-foreground"> ({attribute.unit})</span> : null}
            </Label>
            {renderInput(attribute)}
          </div>
        ))}
      </div>
    </section>
  );
}
