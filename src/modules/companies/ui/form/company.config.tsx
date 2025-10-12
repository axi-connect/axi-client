"use client"

import { z } from "zod";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form";
import type { CreateCompanyDTO, CompanyScheduleItem } from "@/modules/companies/domain/company";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";

export const scheduleItemSchema = z
  .object({
    day: z
      .string()
      .trim()
      .min(1, "Indica el día de operación (ej.: Miércoles)"),
    time_range: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/g, "Usa el formato 24h HH:MM-HH:MM (ej.: 07:00-16:00)"),
  })
  .refine(({ time_range }) => {
    const [start, end] = time_range.split("-")
    if (!start || !end) return false
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number)
      return h * 60 + m
    }
    return toMin(start) < toMin(end)
  }, {
    path: ["time_range"],
    message: "La hora de inicio debe ser menor a la hora de fin",
  })

export const companyFormSchema = z.object({
  nit: z
    .string()
    .trim()
    .regex(/^\d{7,}-\d$/g, "Incluye el dígito de verificación (ej.: 909012345-4)"),
  city: z.string().trim().min(1, "Ingresa la ciudad (ej.: Villavicencio)"),
  address: z.string().trim().min(1, "Dirección completa (ej.: Avenida 40 #22-33)"),
  industry: z.string().trim().min(1, "Sector principal (ej.: Agricultura)"),
  name: z.string().trim().min(1, "Nombre legal o comercial de la empresa"),
  activity_description: z
    .string()
    .trim()
    .min(10, "Describe en al menos 10 caracteres")
    .max(140, "Mantén la descripción en 140 caracteres o menos"),
  company_schedule: z.array(scheduleItemSchema).min(1, "Agrega al menos un horario de atención"),
})

export type CompanyFormValues = z.infer<typeof companyFormSchema>

export const defaultCompanyFormValues: CompanyFormValues = {
  nit: "",
  city: "",
  name: "",
  address: "",
  industry: "",
  activity_description: "",
  company_schedule: [{ day: "", time_range: "" }],
}

export function buildCompanyFormFields(): ReadonlyArray<FieldConfig<CompanyFormValues>> {
  return [
    createInputField<CompanyFormValues>("nit", {label: "NIT", placeholder: "909012345-4", inputProps: {autoFocus: true}}),
    createInputField<CompanyFormValues>("name", {label: "Nombre", placeholder: "AgroLlanos"}),
    createInputField<CompanyFormValues>("city", {label: "Ciudad", placeholder: "Villavicencio"}),
    createInputField<CompanyFormValues>("address", {label: "Dirección", placeholder: "Avenida 40 #22-33"}),
    createInputField<CompanyFormValues>("industry", {label: "Industria", placeholder: "Agricultura"}),
    createInputField<CompanyFormValues>("activity_description", {label: "Descripción de actividad", placeholder: "Producción y comercialización agrícola", colSpan: { base: 1, md: 2 }, inputProps: {rows: 10}, inputKind: "textarea"}),
    createCustomField<CompanyFormValues>(
      "company_schedule",
      ({ value, setValue, getError }) => {
        const items: CompanyScheduleItem[] = Array.isArray(value) ? (value as CompanyScheduleItem[]) : []

        const updateItem = (index: number, key: keyof CompanyScheduleItem, v: string) => {
          const next = [...items]
          next[index] = { ...next[index], [key]: v }
          setValue("company_schedule", next as any)
        }

        const addItem = () => {
          setValue("company_schedule", [...items, { day: "", time_range: "" }] as any)
        }

        const removeItem = (index: number) => {
          const next = items.filter((_, i) => i !== index)
          setValue("company_schedule", next as any)
        }

        return (
          <div className="space-y-2">
            {items.map((item, idx) => {
              const dayError = getError(`${idx}.day`)
              const rangeError = getError(`${idx}.time_range`)

              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start justify-start">
                    <div className="w-full">
                      <label id={`company-schedule-day-${idx}`} className="my-[calc(var(--spacing)*2)] block text-xs text-muted-foreground">Día</label>
                      <DropdownMenu className="w-full">
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            aria-invalid={!!dayError}
                            className="w-full min-h-9"
                          >
                            {item.day || "Selecciona un día"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map((d) => (
                            <DropdownMenuItem key={d} onClick={() => updateItem(idx, "day", d)}>
                              {d}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {dayError ? (
                        <p className="text-destructive text-xs mt-1">{dayError}</p>
                      ) : null}
                    </div>

                    <div>
                      <label className="my-[calc(var(--spacing)*2)] block text-xs text-muted-foreground">Rango (HH:MM-HH:MM)</label>
                      <Input
                        value={item.time_range}
                        id={`df-company_schedule-${idx}`}
                        placeholder="07:00-16:00"
                        aria-invalid={!!rangeError}
                        onChange={(e) => updateItem(idx, "time_range", e.target.value)}
                      />
                      {rangeError ? (
                        <p className="text-destructive text-xs mt-1">{rangeError}</p>
                      ) : null}
                    </div>
                  
                    <div className="flex gap-2 self-end">
                      <Button type="button" variant="outline" onClick={() => removeItem(idx)}>
                        Quitar
                      </Button>
                    </div>
                </div>
              )
            })}
            <Button type="button" variant="ghost" onClick={addItem}>
              Agregar horario
            </Button>
          </div>
        )
      },
      {
        htmlFor: "df-company_schedule-0",
        label: "Horario de la empresa",
        colSpan: { base: 1, md: 2 },
      }
    ),
  ] as const
}

export function toCreateCompanyDTO(values: CompanyFormValues): CreateCompanyDTO {
  return { ...values }
}