"use client"

import { z } from "zod"
import type { CompanyDTO, UpdateCompanyDTO } from "@/modules/companies/domain/company"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { TIMEZONES, timezoneLabel } from "@/shared/data/countries"
import { NichePicker } from "@/modules/companies/ui/components/settings/NichePicker"

// Las zonas horarias salen del catálogo compartido (`shared/data/countries.ts`),
// la misma fuente que el alta de tenants y el registro. Si la empresa trae una
// zona fuera del catálogo se conserva como opción extra en vez de perderse.

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
  niche_code: z.string().trim().optional().or(z.literal("")),
  activity_description: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
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
    niche_code: company.niche_code ?? "",
    activity_description: company.activity_description ?? "",
    timezone: company.timezone,
  }
}

/**
 * `savedNiche`: el tipo de negocio guardado, para que la isla «Al guardar»
 * diga «Así está hoy» hasta que se elija otro (Cobros premium P1).
 */
export function buildCompanyFormFields(savedNiche = ""): ReadonlyArray<FieldConfig<CompanyFormValues>> {
  return [
    createInputField<CompanyFormValues>("name", { label: "Nombre", placeholder: "Mi empresa S.A.S." }),
    createCustomField<CompanyFormValues>(
      "niche_code",
      ({ value, setValue, getError }) => (
        <NichePicker
          value={typeof value === "string" ? value : ""}
          saved={savedNiche}
          onChange={(next) => setValue("niche_code", next)}
          error={getError()}
        />
      ),
      // Ocupa la fila entera: las tarjetas y la isla «Al guardar» no caben en media.
      { colSpan: { base: 1, md: 2 } },
    ),
    createInputField<CompanyFormValues>("industry", {
      label: "Industria",
      placeholder: "Retail, salud, educación…",
      description: "Texto libre: así se describe tu empresa en el prompt del agente.",
    }),
    createInputField<CompanyFormValues>("city", { label: "Ciudad", placeholder: "Bogotá" }),
    createInputField<CompanyFormValues>("address", {
      label: "Dirección",
      placeholder: "Cra 1 # 2-34",
      description: "La IA la usa cuando no hay sucursales configuradas.",
    }),
    createCustomField<CompanyFormValues>("timezone", ({ value, setValue, getError }) => {
      const current = typeof value === "string" ? value : ""
      const options = current && !TIMEZONES.includes(current) ? [current, ...TIMEZONES] : TIMEZONES
      const error = getError()
      return (
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-timezone">Zona horaria</Label>
          <Select value={current} onValueChange={(next) => setValue("timezone", next)}>
            <SelectTrigger id="company-timezone" className="w-full" aria-label="Zona horaria">
              <SelectValue placeholder="Elige la zona horaria" />
            </SelectTrigger>
            <SelectContent>
              {options.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {timezoneLabel(tz)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )
    }),
    createInputField<CompanyFormValues>("isotype_url", { label: "Logo (URL)", placeholder: "https://…/logo.png" }),
    createInputField<CompanyFormValues>("activity_description", {
      label: "Descripción de la actividad",
      inputKind: "textarea",
      placeholder: "Qué hace tu empresa: la IA usa esta descripción como contexto.",
      description: "Máximo 500 caracteres.",
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
    // Cadena vacía = «sin elegir»: se manda null, no "".
    niche_code: values.niche_code || null,
    activity_description: values.activity_description || null,
    timezone: values.timezone,
  }
}
