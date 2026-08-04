"use client";

/**
 * Drawer de tarifa IA (crear/editar) sobre `DetailSheet` + `DynamicForm`.
 * - Crear: el POST es UPSERT por (provider, model, effective_from) → aviso.
 * - Editar: `provider/model/effective_from` inmutables (candado) — el
 *   versionado canónico es cerrar con "Vigente hasta" y crear una nueva.
 */
import { Lock, TriangleAlert, Info } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useAlert } from "@/core/providers/alert-provider";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  createCustomField,
  createInputField,
  DynamicForm,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PROVIDERS, type PricingRate } from "../../../domain/pricing";
import { useCreatePricing, useUpdatePricing } from "../../../infrastructure/api/hooks/use-pricing";
import { isoToDateInput } from "./pricing-format";
import {
  defaultPricingFormValues,
  pricingFormSchema,
  toCreatePricingDTO,
  toUpdatePricingDTO,
  type PricingFormValues,
} from "./pricing-form.config";

type PricingFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tarifa a editar; `null` = crear. */
  rate: PricingRate | null;
};

const IMMUTABLE_HINT = (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Lock aria-hidden="true" className="size-3" />
    Inmutable tras la creación
  </span>
);

export function PricingFormSheet({ open, onOpenChange, rate }: PricingFormSheetProps) {
  const { showAlert } = useAlert();
  const createPricing = useCreatePricing();
  const updatePricing = useUpdatePricing();
  const isEditing = rate !== null;

  const defaultValues: PricingFormValues = isEditing
    ? {
        provider: rate.provider,
        model: rate.model,
        display_name: rate.display_name ?? "",
        is_default: rate.is_default,
        input_cost_per_mtok_usd: rate.input_cost_per_mtok_usd,
        output_cost_per_mtok_usd: rate.output_cost_per_mtok_usd,
        cache_read_per_mtok_usd: rate.cache_read_per_mtok_usd ?? undefined,
        margin_multiplier: rate.margin_multiplier,
        effective_from: isoToDateInput(rate.effective_from),
        effective_to: isoToDateInput(rate.effective_to),
      }
    : defaultPricingFormValues;

  const fields: FieldConfig<PricingFormValues>[] = [
    createCustomField<PricingFormValues>("provider", ({ value, setValue }) => (
      <Select
        value={String(value ?? "anthropic")}
        onValueChange={(provider) => setValue("provider", provider as PricingFormValues["provider"])}
        disabled={isEditing}
      >
        <SelectTrigger className="w-full" aria-label="Proveedor">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROVIDERS.map((provider) => (
            <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ), { label: "Proveedor *", description: isEditing ? IMMUTABLE_HINT : undefined }),
    createInputField<PricingFormValues>("model", {
      label: "Modelo *",
      placeholder: "claude-sonnet-5",
      autoComplete: "off",
      description: isEditing ? IMMUTABLE_HINT : "Usa * como modelo para la tarifa fallback del proveedor.",
      inputProps: { disabled: isEditing, className: "font-mono" },
    }),
    // El catálogo de modelos del tenant sale de estas tarifas: sin nombre
    // visible el selector del agente mostraría el id técnico
    createInputField<PricingFormValues>("display_name", {
      label: "Nombre visible",
      placeholder: "Claude Sonnet 4.5",
      autoComplete: "off",
      description: "Lo ve el tenant al elegir el modelo de un agente. Vacío solo en la tarifa fallback (*).",
    }),
    createCustomField<PricingFormValues>("is_default", ({ value, setValue }) => (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-[var(--axi-brand)]"
          checked={value === true}
          onChange={(event) => setValue("is_default", event.target.checked)}
        />
        Preseleccionar para el proveedor
      </label>
    ), {
      label: "Preselección",
      description: "Solo uno por proveedor: al marcarlo, el anterior deja de serlo.",
    }),
    createInputField<PricingFormValues>("input_cost_per_mtok_usd", {
      label: "Entrada (USD/MTok) *",
      inputKind: "number",
      inputProps: { step: "0.000001", min: 0 },
    }),
    createInputField<PricingFormValues>("output_cost_per_mtok_usd", {
      label: "Salida (USD/MTok) *",
      inputKind: "number",
      inputProps: { step: "0.000001", min: 0 },
    }),
    createInputField<PricingFormValues>("cache_read_per_mtok_usd", {
      label: "Caché lectura (USD/MTok)",
      inputKind: "number",
      description: "Vacío si el proveedor no factura caché.",
      inputProps: { step: "0.000001", min: 0 },
    }),
    createInputField<PricingFormValues>("margin_multiplier", {
      label: "Margen (×) *",
      inputKind: "number",
      description: "Multiplicador sobre el costo del proveedor (1 = sin margen).",
      inputProps: { step: "0.01", min: 0 },
    }),
    createInputField<PricingFormValues>("effective_from", {
      label: "Vigente desde *",
      inputKind: "date",
      description: isEditing ? IMMUTABLE_HINT : undefined,
      inputProps: { disabled: isEditing },
    }),
    ...(isEditing
      ? [
          createInputField<PricingFormValues>("effective_to", {
            label: "Vigente hasta",
            inputKind: "date",
            description: "Vacío = sigue vigente. Ponle fecha para cerrarla y crear la nueva tarifa.",
          }),
        ]
      : []),
  ];

  async function onSubmit(values: PricingFormValues, form: UseFormReturn<PricingFormValues>) {
    try {
      if (isEditing) {
        await updatePricing.mutateAsync({ id: rate.id, body: toUpdatePricingDTO(values) });
      } else {
        await createPricing.mutateAsync(toCreatePricingDTO(values));
      }
      showAlert({
        tone: "success",
        title: isEditing ? "Tarifa actualizada" : "Tarifa creada",
        description: `${values.provider} · ${values.model}`,
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidation(error, form)) return;
      showAlert({ tone: "error", title: "No se pudo guardar la tarifa", description: errorMessage(error) });
    }
  }

  const pending = createPricing.isPending || updatePricing.isPending;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Editar tarifa · ${rate.model}` : "Crear tarifa"}
      subtitle="USD por millón de tokens (MTok)"
      size="lg"
    >
      <div className="space-y-4 p-4">
        {isEditing ? (
          <Alert className="border-info/30 bg-info/5">
            <Info aria-hidden="true" className="size-4 text-info" />
            <AlertTitle>Versionado por vigencia</AlertTitle>
            <AlertDescription>
              Para cambiar precios desde una fecha: cierra esta tarifa con «Vigente hasta» y crea una
              nueva con otra vigencia.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-warning/30 bg-warning/5">
            <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
            <AlertTitle>Es un upsert</AlertTitle>
            <AlertDescription>
              Si ya existe una tarifa con el mismo proveedor + modelo + fecha de vigencia, se
              sobreescribe.
            </AlertDescription>
          </Alert>
        )}

        <DynamicForm<PricingFormValues>
          schema={pricingFormSchema}
          defaultValues={defaultValues}
          fields={fields}
          onSubmit={onSubmit}
          actions={{
            render: ({ submitting }) => (
              <div className="flex w-full items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || pending}>
                  {pending ? "Guardando…" : isEditing ? "Guardar" : "Crear tarifa"}
                </Button>
              </div>
            ),
          }}
        />
      </div>
    </DetailSheet>
  );
}
