"use client";

import { z } from "zod";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form";
import type {
  ContactDTO,
  CreateContactDTO,
  UpdateContactDTO,
} from "@/modules/crm/domain/contact";
import {
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_ORDER,
  type ContactLifecycleStage,
} from "@/modules/crm/domain/enums";

/**
 * Config del formulario de contacto (alta manual / edición).
 * El contrato exige al menos un dato de contacto (teléfono o correo);
 * `lifecycle_stage` solo existe en el PATCH (el alta siempre nace prospecto).
 */
export const contactFormSchema = z
  .object({
    first_name: z.string().trim().min(1, "Nombre requerido").max(120),
    last_name: z.string().trim().max(120).optional().or(z.literal("")),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    email: z.email("Correo inválido").optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    address: z.string().trim().max(255).optional().or(z.literal("")),
    lifecycle_stage: z.enum(["prospect", "lead", "customer", "other"]),
  })
  .superRefine((values, ctx) => {
    if (!values.phone && !values.email) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Indica al menos un teléfono o un correo",
      });
    }
  });

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const defaultContactFormValues: ContactFormValues = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  lifecycle_stage: "prospect",
};

export function contactToFormValues(dto: ContactDTO): ContactFormValues {
  return {
    first_name: dto.first_name ?? dto.full_name ?? "",
    last_name: dto.last_name ?? "",
    phone: dto.phone ?? "",
    email: dto.email ?? "",
    city: dto.city ?? "",
    address: dto.address ?? "",
    lifecycle_stage: dto.lifecycle_stage,
  };
}

export function buildContactFormFields(options: {
  /** La etapa solo se edita sobre un contacto existente (PATCH). */
  editing: boolean;
}): ReadonlyArray<FieldConfig<ContactFormValues>> {
  return [
    createInputField<ContactFormValues>("first_name", {
      label: "Nombre",
      placeholder: "Carlos",
    }),
    createInputField<ContactFormValues>("last_name", {
      label: "Apellido",
      placeholder: "Comprador",
    }),
    createInputField<ContactFormValues>("phone", {
      label: "Teléfono",
      placeholder: "+57 300 999 8877",
    }),
    createInputField<ContactFormValues>("email", {
      label: "Correo",
      inputKind: "email",
      placeholder: "carlos@acme.co",
    }),
    createInputField<ContactFormValues>("city", {
      label: "Ciudad",
      placeholder: "Bogotá",
    }),
    createInputField<ContactFormValues>("address", {
      label: "Dirección",
      placeholder: "Cra 7 # 12-34",
    }),
    createCustomField<ContactFormValues>(
      "lifecycle_stage",
      ({ value, setValue }) => (
        <select
          value={value as ContactLifecycleStage}
          onChange={(e) => setValue("lifecycle_stage", e.target.value as ContactLifecycleStage)}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          aria-label="Etapa del ciclo de vida"
        >
          {CONTACT_STAGE_ORDER.map((stage) => (
            <option key={stage} value={stage}>
              {CONTACT_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      ),
      { label: "Etapa", isVisible: () => options.editing },
    ),
  ] as const;
}

export function toCreateContactDTO(values: ContactFormValues): CreateContactDTO {
  return {
    first_name: values.first_name,
    last_name: values.last_name || undefined,
    phone: values.phone || undefined,
    email: values.email || undefined,
    city: values.city || undefined,
    address: values.address || undefined,
  };
}

export function toUpdateContactDTO(values: ContactFormValues): UpdateContactDTO {
  // Campo vacío en edición = el usuario lo limpió → null (el PATCH lo borra).
  return {
    first_name: values.first_name,
    last_name: values.last_name || null,
    phone: values.phone || null,
    email: values.email || null,
    city: values.city || null,
    address: values.address || null,
    lifecycle_stage: values.lifecycle_stage,
  };
}
