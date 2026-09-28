"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { errorMessage } from "@/core/lib/error-messages";
import type { ProductTypeAttributeDTO, ProductTypeDTO } from "@/modules/catalog/domain/product-type";
import type { ProductDTO } from "@/modules/catalog/domain/product";
import { setProductAttributeValues } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { AttributeValueInput } from "./AttributeValueInput";
import type { AppAlert } from "@/core/notifications";

type AttributeValueMap = Record<string, string | number | boolean>;

function sameValues(a: AttributeValueMap, b: AttributeValueMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}

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
  onDirtyChange,
}: {
  product: ProductDTO;
  productType: ProductTypeDTO;
  canManage: boolean;
  /** true cuando se llega desde crear con atributos requeridos pendientes. */
  highlightRequired?: boolean;
  onSaved: (updated: ProductDTO) => void;
  setAlert?: (alert: AppAlert) => void;
  /** Catálogo premium F3: la ficha avisa antes de salir con cambios sin guardar. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState<AttributeValueMap>(() => initialValues(product));
  const [saving, setSaving] = useState(false);

  // Re-sincroniza cuando el producto se re-fetchea (p. ej. tras editar variantes).
  useEffect(() => {
    setValues(initialValues(product));
  }, [product]);

  // Sucio = distinto de lo guardado (antes el botón quedaba siempre activo y nada avisaba al salir).
  const dirty = useMemo(() => !sameValues(values, initialValues(product)), [values, product]);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

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
        tone: "error",
        title: `Completa los atributos requeridos: ${missingRequired.join(", ")}`,
      });
      return;
    }
    try {
      setSaving(true);
      const updated = await setProductAttributeValues(product.id, { values });
      setAlert?.({ tone: "success", title: "Atributos guardados correctamente" });
      onSaved(updated);
    } catch (err) {
      setAlert?.({ tone: "error", title: errorMessage(err, "No se pudieron guardar los atributos") });
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
    <section id="atributos" className="scroll-mt-24 space-y-4" aria-label="Atributos del producto">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">
          Atributos <span className="font-normal text-muted-foreground">({productType.name})</span>
        </h2>
        {canManage && (
          <Button type="button" size="sm" variant="outline" className="rounded-full px-4" onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar atributos"}
          </Button>
        )}
      </div>
      {highlightRequired && missingRequired.length > 0 && (
        // Aviso en línea del DS: el ámbar va en el icono, no en el texto (no pasa AA, §9.4).
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>Faltan atributos requeridos: {missingRequired.join(", ")}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
