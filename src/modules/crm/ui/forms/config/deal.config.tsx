"use client";

import { z } from "zod";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form";
import { parseMoneyToCents } from "@/core/lib/format";
import type { CreateDealDTO } from "@/modules/crm/domain/deal";
import { ContactPicker } from "@/modules/crm/ui/forms/ContactPicker";

/**
 * Config del formulario de nueva oportunidad. El contrato solo exige
 * `contact_id` + `title`; pipeline/stage default los resuelve el backend.
 * El valor es SIEMPRE edición humana (la IA nunca lo fija — D10).
 */
export const dealFormSchema = z.object({
  contact: z
    .object({ id: z.string(), label: z.string() })
    .nullable()
    .refine((value) => value !== null, "Selecciona el contacto"),
  title: z.string().trim().min(1, "Título requerido").max(200),
  value: z
    .string()
    .trim()
    .refine((value) => value === "" || parseMoneyToCents(value) !== null, "Monto inválido"),
  expected_close_date: z.string(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

export function defaultDealFormValues(contact?: { id: string; label: string }): DealFormValues {
  return {
    contact: contact ?? null,
    title: "",
    value: "",
    expected_close_date: "",
    notes: "",
  };
}

export function buildDealFormFields(): ReadonlyArray<FieldConfig<DealFormValues>> {
  return [
    createCustomField<DealFormValues>(
      "contact",
      ({ value, setValue, getError }) => (
        <ContactPicker
          value={value as DealFormValues["contact"]}
          onChange={(contact) => setValue("contact", contact)}
          error={getError()}
        />
      ),
      { label: "Contacto", colSpan: { base: 1, md: 2 } },
    ),
    createInputField<DealFormValues>("title", {
      label: "Título",
      placeholder: "Plan anual x2 sedes",
      colSpan: { base: 1, md: 2 },
    }),
    createInputField<DealFormValues>("value", {
      label: "Valor estimado (opcional)",
      placeholder: "350000",
    }),
    createInputField<DealFormValues>("expected_close_date", {
      label: "Cierre esperado (opcional)",
      inputKind: "date",
    }),
    createInputField<DealFormValues>("notes", {
      label: "Notas (opcional)",
      inputKind: "textarea",
      colSpan: { base: 1, md: 2 },
    }),
  ] as const;
}

export function toCreateDealDTO(values: DealFormValues, pipelineId?: string): CreateDealDTO {
  const cents = values.value.trim() === "" ? null : parseMoneyToCents(values.value);
  return {
    contact_id: (values.contact as { id: string }).id,
    title: values.title,
    pipeline_id: pipelineId,
    value_cents: cents ?? undefined,
    expected_close_date: values.expected_close_date || undefined,
    notes: values.notes || undefined,
  };
}
