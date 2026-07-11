"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import type { FieldErrors } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  attributeOptions,
  type ProductTypeAttributeDTO,
} from "@/modules/catalog/domain/product-type";
import type {
  ProductFormValues,
  VariantRowValues,
} from "@/modules/catalog/ui/forms/config/product.config";
import { PriceInput } from "./PriceInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const UNSET_OPTION = "__unset__";

/** Input tipado para un eje de variante (text/number/boolean/select). */
function AxisInput({
  axis,
  rowKey,
  value,
  onChange,
}: {
  axis: ProductTypeAttributeDTO;
  rowKey: string;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean | undefined) => void;
}) {
  const inputId = `variant-${rowKey}-${axis.code}`;
  if (axis.type === "select") {
    return (
      <Select
        value={value === undefined ? UNSET_OPTION : String(value)}
        onValueChange={(v: string) => onChange(v === UNSET_OPTION ? undefined : v)}
      >
        <SelectTrigger id={inputId} className="w-full">
          <SelectValue placeholder={axis.label} />
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
    );
  }
  if (axis.type === "boolean") {
    return (
      <label className="flex h-9 items-center gap-2 text-sm">
        <input
          id={inputId}
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        Sí
      </label>
    );
  }
  if (axis.type === "number") {
    return (
      <Input
        id={inputId}
        type="number"
        inputMode="decimal"
        value={value === undefined ? "" : String(value)}
        placeholder={axis.unit ?? undefined}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
  }
  return (
    <Input
      id={inputId}
      value={value === undefined ? "" : String(value)}
      maxLength={120}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
    />
  );
}

/**
 * Editor local de variantes para el POST de creación de producto.
 * Los ejes provienen de los atributos `scope=variant` del tipo elegido;
 * el backend valida la combinación (única por producto). La primera fila
 * queda como variante por defecto.
 */
export function VariantRowsEditor({
  value,
  onChange,
  axes,
  isService,
  currency,
  errors,
}: {
  value: VariantRowValues[];
  onChange: (rows: VariantRowValues[]) => void;
  axes: ProductTypeAttributeDTO[];
  isService: boolean;
  currency: string;
  errors?: FieldErrors<ProductFormValues>["variants"];
}) {
  const patchRow = (index: number, patch: Partial<VariantRowValues>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const patchAttribute = (index: number, code: string, attrValue: string | number | boolean | undefined) => {
    const attributes = { ...value[index].attributes };
    if (attrValue === undefined) {
      delete attributes[code];
    } else {
      attributes[code] = attrValue;
    }
    patchRow(index, { attributes });
  };

  const addRow = () => {
    onChange([...value, { sku: "", name: "", price_cents: null, initial_stock: undefined, attributes: {} }]);
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Añade la primera variante (será la variante por defecto).
        </div>
      )}

      <ul className="space-y-3">
        {value.map((row, index) => {
          const rowErrors = Array.isArray(errors) ? errors[index] : undefined;
          return (
            <li key={index} className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {index === 0 && <Star className="h-3.5 w-3.5 text-brand" aria-hidden />}
                  {index === 0 ? "Variante por defecto" : `Variante ${index + 1}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label={`Eliminar variante ${row.sku || index + 1}`}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`variant-${index}-sku`}>SKU</Label>
                  <Input
                    id={`variant-${index}-sku`}
                    value={row.sku}
                    maxLength={64}
                    placeholder="CAM-R-M"
                    className="font-mono"
                    aria-invalid={Boolean(rowErrors?.sku)}
                    onChange={(e) => patchRow(index, { sku: e.target.value })}
                  />
                  {rowErrors?.sku?.message && (
                    <p className="text-xs text-destructive">{String(rowErrors.sku.message)}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variant-${index}-name`}>Nombre</Label>
                  <Input
                    id={`variant-${index}-name`}
                    value={row.name ?? ""}
                    maxLength={120}
                    placeholder="Roja · M (opcional)"
                    onChange={(e) => patchRow(index, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variant-${index}-price`}>Precio</Label>
                  <PriceInput
                    id={`variant-${index}-price`}
                    value={row.price_cents}
                    currency={currency}
                    placeholder="Hereda el precio base"
                    onChange={(cents) => patchRow(index, { price_cents: cents })}
                  />
                </div>
                {!isService && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`variant-${index}-stock`}>Stock inicial</Label>
                    <Input
                      id={`variant-${index}-stock`}
                      type="number"
                      min={0}
                      step={1}
                      value={row.initial_stock === undefined ? "" : String(row.initial_stock)}
                      placeholder="0"
                      className="tabular-nums"
                      onChange={(e) =>
                        patchRow(index, {
                          initial_stock: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
                {axes.map((axis) => (
                  <div key={axis.code} className="space-y-1.5">
                    <Label htmlFor={`variant-${index}-${axis.code}`}>
                      {axis.label}
                      {axis.unit ? <span className="text-muted-foreground"> ({axis.unit})</span> : null}
                    </Label>
                    <AxisInput
                      axis={axis}
                      rowKey={String(index)}
                      value={row.attributes[axis.code]}
                      onChange={(attrValue) => patchAttribute(index, axis.code, attrValue)}
                    />
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="outline" onClick={addRow}>
        <Plus className="h-4 w-4" />
        Añadir variante
      </Button>
    </div>
  );
}
