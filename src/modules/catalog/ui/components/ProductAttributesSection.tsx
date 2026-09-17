"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { errorMessage } from "@/core/lib/error-messages";
import type { ProductTypeAttributeDTO, ProductTypeDTO } from "@/modules/catalog/domain/product-type";
import type { ProductDTO } from "@/modules/catalog/domain/product";
import { setProductAttributeValues } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { AttributeValueInput } from "./AttributeValueInput";

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
    const value = values[attribute.code];
    const missing = highlightRequired === true && attribute.is_required && value === undefined;
    return (
      <AttributeValueInput
        attribute={attribute}
        id={`product-attr-${attribute.code}`}
        value={value}
        disabled={!canManage}
        invalid={missing}
        onChange={(next) => setValue(attribute.code, next)}
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
