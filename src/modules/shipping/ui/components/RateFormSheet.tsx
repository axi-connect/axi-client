"use client";

import { useId, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { DetailSheet, DetailSheetFooter } from "@/shared/components/features/detail-sheet";
import type { ShippingRateDTO, ShippingZoneDTO } from "@/modules/shipping/domain/shipping";
import {
  RATE_NAME_MAX,
  toCreateRateDTO,
  toUpdateRateDTO,
  validateRate,
  type RateFormErrors,
  type RateFormValues,
} from "@/modules/shipping/domain/shipping-form";
import {
  createShippingRate,
  updateShippingRate,
} from "@/modules/shipping/infrastructure/services/shipping-service.adapter";

/**
 * Crear/editar una tarifa plana: nombre, precio en pesos (0 = gratis) y
 * condición por monto del pedido. «Gratis desde X» son DOS tarifas: una hasta
 * X−1 con precio y otra desde X a 0 — la ayuda lo dice.
 */
export function RateFormSheet({
  open,
  zone,
  rate,
  initialValues,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  zone: ShippingZoneDTO;
  /** `null` = crear. */
  rate: ShippingRateDTO | null;
  initialValues: RateFormValues;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { showAlert } = useAlert();
  const formId = useId();
  const [values, setValues] = useState<RateFormValues>(initialValues);
  const [errors, setErrors] = useState<RateFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const isEditing = rate !== null;

  const set = (key: keyof RateFormValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateRate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    try {
      if (isEditing) await updateShippingRate(rate.id, toUpdateRateDTO(values));
      else await createShippingRate(zone.id, toCreateRateDTO(values));
      onSaved();
      onOpenChange(false);
      showAlert({ tone: "success", title: isEditing ? "Tarifa actualizada" : "Tarifa creada", open: true, autoCloseMs: 3000 });
    } catch (error) {
      setErrors({ name: errorMessage(error, "No se pudo guardar la tarifa. Inténtalo de nuevo.") });
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    key: keyof RateFormValues,
    label: string,
    placeholder: string,
    hint?: string,
    inputMode: "text" | "numeric" = "text",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${formId}-${key}`}>{label}</Label>
      <Input
        id={`${formId}-${key}`}
        value={values[key]}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={key === "name" ? RATE_NAME_MAX : undefined}
        aria-invalid={errors[key] !== undefined}
        onChange={set(key)}
        className={inputMode === "numeric" ? "tabular-nums" : undefined}
      />
      {errors[key] ? (
        <p role="alert" className="text-xs text-destructive">
          {errors[key]}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar tarifa · ${rate.name}` : `Nueva tarifa · ${zone.name}`}
      subtitle="Lo que la IA le dice al cliente que vale el envío en esta zona."
      size="md"
      renderFooter={() => (
        <DetailSheetFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Guardar tarifa
          </Button>
        </DetailSheetFooter>
      )}
    >
      <form id={formId} onSubmit={(event) => void submit(event)} className="space-y-5 p-4" noValidate>
        {field("name", "Nombre", "Envío estándar")}
        {field("price", "Precio", "12.000", "En pesos. Pon 0 si el envío es gratis.", "numeric")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("min_order", "Pedidos desde", "Sin mínimo", undefined, "numeric")}
          {field("max_order", "Pedidos hasta", "Sin tope", undefined, "numeric")}
        </div>
        <p className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
          «Envío gratis desde $200.000» son dos tarifas: una <b className="font-medium text-foreground">hasta $199.999</b> con
          precio y otra <b className="font-medium text-foreground">desde $200.000</b> a $0.
        </p>
      </form>
    </DetailSheet>
  );
}
