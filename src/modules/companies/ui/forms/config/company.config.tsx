"use client"

import { z } from "zod"
import type { CompanyDTO, UpdateCompanyDTO } from "@/modules/companies/domain/company"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createInputField } from "@/shared/components/features/dynamic-form"

/**
 * Config del formulario "Mi empresa" (`PATCH /companies/me`).
 * nit / country_code / currency / status son de solo lectura (los gestiona
 * la plataforma); aquí solo se editan los datos operativos.
 */
export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  isotype_url: z.url("URL inválida").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  industry: z.string().trim().optional().or(z.literal("")),
  activity_description: z.string().trim().max(2000, "Máximo 2000 caracteres").optional().or(z.literal("")),
  timezone: z.string().trim().min(1, "Zona horaria requerida"),
})

export type CompanyFormValues = z.infer<typeof companyFormSchema>

export function companyToFormValues(company: CompanyDTO): CompanyFormValues {
  return {
    name: company.name,
    isotype_url: company.isotype_url ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    industry: company.industry ?? "",
    activity_description: company.activity_description ?? "",
    timezone: company.timezone,
  }
}

export function buildCompanyFormFields(): ReadonlyArray<FieldConfig<CompanyFormValues>> {
  return [
    createInputField<CompanyFormValues>("name", { label: "Nombre", placeholder: "Mi empresa S.A.S." }),
    createInputField<CompanyFormValues>("industry", { label: "Industria", placeholder: "Retail, salud, educación…" }),
    createInputField<CompanyFormValues>("city", { label: "Ciudad", placeholder: "Bogotá" }),
    createInputField<CompanyFormValues>("address", { label: "Dirección", placeholder: "Cra 1 # 2-34" }),
    createInputField<CompanyFormValues>("timezone", { label: "Zona horaria", placeholder: "America/Bogota" }),
    createInputField<CompanyFormValues>("isotype_url", { label: "Logo (URL)", placeholder: "https://…/logo.png" }),
    createInputField<CompanyFormValues>("activity_description", {
      label: "Descripción de la actividad",
      inputKind: "textarea",
      placeholder: "Qué hace tu empresa: la IA usa esta descripción como contexto.",
      colSpan: { base: 2 },
    }),
  ] as const
}

export function toUpdateCompanyDTO(values: CompanyFormValues): UpdateCompanyDTO {
  return {
    name: values.name,
    isotype_url: values.isotype_url || null,
    address: values.address || null,
    city: values.city || null,
    industry: values.industry || null,
    activity_description: values.activity_description || null,
    timezone: values.timezone,
  }
}
