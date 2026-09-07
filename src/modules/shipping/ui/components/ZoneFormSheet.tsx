"use client";

import { useId, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DetailSheet, DetailSheetFooter } from "@/shared/components/features/detail-sheet";
import { MultiSelect } from "@/shared/components/features/multi-select";
import { CO_PROVINCES } from "@/modules/shipping/domain/co-provinces";
import type { ShippingZoneDTO } from "@/modules/shipping/domain/shipping";
import {
  toCreateZoneDTO,
  toUpdateZoneDTO,
  validateZone,
  ZONE_NAME_MAX,
  type ZoneFormErrors,
  type ZoneFormValues,
} from "@/modules/shipping/domain/shipping-form";
import {
  createShippingZone,
  updateShippingZone,
} from "@/modules/shipping/infrastructure/services/shipping-service.adapter";

const OTHER_COUNTRY = "__other__";

/**
 * Crear/editar una zona (mockup «Nueva zona»): nombre, departamentos con el
 * `MultiSelect` de la casa (buscable), país. Departamentos vacíos = resto del
 * país (E8). El sheet se queda abierto si el servidor rechaza (409 nombre
 * repetido): cerrarlo con el formulario inválido era el incidente del 7-sep.
 */
export function ZoneFormSheet({
  open,
  zone,
  initialValues,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** `null` = crear. */
  zone: ShippingZoneDTO | null;
  initialValues: ZoneFormValues;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { showAlert } = useAlert();
  const formId = useId();
  const [values, setValues] = useState<ZoneFormValues>(initialValues);
  const [errors, setErrors] = useState<ZoneFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const isEditing = zone !== null;
  const isColombia = values.country_code.toUpperCase() === "CO";

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateZone(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    try {
      if (isEditing) await updateShippingZone(zone.id, toUpdateZoneDTO(values));
      else await createShippingZone(toCreateZoneDTO(values));
      onSaved();
      onOpenChange(false);
      showAlert({ tone: "success", title: isEditing ? "Zona actualizada" : "Zona creada", open: true, autoCloseMs: 3000 });
    } catch (error) {
      setErrors({ name: errorMessage(error, "No se pudo guardar la zona. Revisa el nombre e inténtalo de nuevo.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar zona · ${zone.name}` : "Nueva zona"}
      subtitle="Elige los departamentos que comparten tarifas."
      size="md"
      renderFooter={() => (
        <DetailSheetFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Guardar zona
          </Button>
        </DetailSheetFooter>
      )}
    >
      <form id={formId} onSubmit={(event) => void submit(event)} className="space-y-5 p-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-name`}>Nombre</Label>
          <Input
            id={`${formId}-name`}
            value={values.name}
            maxLength={ZONE_NAME_MAX}
            placeholder="Eje Cafetero"
            aria-invalid={errors.name !== undefined}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          />
          {errors.name && (
            <p role="alert" className="text-xs text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-country`}>País</Label>
          <Select
            value={isColombia ? "CO" : OTHER_COUNTRY}
            onValueChange={(value: string) =>
              setValues((prev) => ({
                ...prev,
                country_code: value === "CO" ? "CO" : prev.country_code === "CO" ? "" : prev.country_code,
                province_codes: value === "CO" ? prev.province_codes : [],
              }))
            }
          >
            <SelectTrigger id={`${formId}-country`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CO">Colombia</SelectItem>
              <SelectItem value={OTHER_COUNTRY}>Otro país (zona internacional)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isColombia ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-provinces`}>Departamentos</Label>
            <MultiSelect
              id={`${formId}-provinces`}
              options={CO_PROVINCES.map((province) => ({ label: province.name, value: province.code }))}
              defaultValue={values.province_codes}
              onValueChange={(codes) => setValues((prev) => ({ ...prev, province_codes: codes }))}
              placeholder="Buscar departamento…"
              searchable
              maxCount={4}
              hideSelectAll
            />
            <p className="text-xs text-muted-foreground">
              Déjalo vacío para que la zona cubra el resto del país.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-code`}>Código del país</Label>
            <Input
              id={`${formId}-code`}
              value={values.country_code}
              maxLength={2}
              placeholder="US"
              className="w-24 uppercase"
              aria-invalid={errors.country_code !== undefined}
              onChange={(event) => setValues((prev) => ({ ...prev, country_code: event.target.value.toUpperCase() }))}
            />
            {errors.country_code && (
              <p role="alert" className="text-xs text-destructive">
                {errors.country_code}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Dos letras ISO. La zona cubre todo ese país.</p>
          </div>
        )}
      </form>
    </DetailSheet>
  );
}
