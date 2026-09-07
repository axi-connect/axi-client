"use client"

import { z } from "zod"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form"
import type { LocationSuggestion } from "@/shared/components/features/location"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import type { BranchDTO, CreateBranchDTO, UpdateBranchDTO } from "@/modules/companies/domain/branch"
import type { ScheduleInput } from "@/modules/companies/domain/company"
import {
  buildDayStates,
  invalidScheduleDays,
  toScheduleInputs,
  type DayState,
} from "@/modules/companies/domain/schedules"
import { BranchLocationField } from "@/modules/companies/ui/forms/BranchLocationField"
import { SchedulesFields } from "@/modules/companies/ui/forms/SchedulesFields"

/** Topes del backend (`createBranchSchema`). El horario es UI: `use_company_hours` no viaja. */
export const branchFormSchema = z
  .object({
    name: z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
    address: z.string().trim().min(3, "Elige o escribe una dirección").max(200, "Máximo 200 caracteres"),
    city: z.string().trim().max(80, "Máximo 80 caracteres").optional().or(z.literal("")),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    directions: z.string().trim().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
    is_main: z.boolean(),
    is_active: z.boolean(),
    use_company_hours: z.boolean(),
    schedules: z.array(
      z.object({
        weekday: z.number(),
        enabled: z.boolean(),
        opens_at: z.string(),
        closes_at: z.string(),
      }),
    ),
  })
  .superRefine((values, ctx) => {
    if ((values.latitude === null) !== (values.longitude === null)) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "La ubicación quedó incompleta: vuelve a elegirla" })
    }
    if (!values.use_company_hours && invalidScheduleDays(values.schedules).length > 0) {
      ctx.addIssue({ code: "custom", path: ["schedules"], message: "La hora de cierre debe ser posterior a la de apertura" })
    }
  })

export type BranchFormValues = z.infer<typeof branchFormSchema>

export function defaultBranchValues(isFirst: boolean): BranchFormValues {
  return {
    name: "",
    address: "",
    city: "",
    latitude: null,
    longitude: null,
    directions: "",
    is_main: isFirst,
    is_active: true,
    use_company_hours: true,
    schedules: buildDayStates([]),
  }
}

export function branchToFormValues(branch: BranchDTO): BranchFormValues {
  return {
    name: branch.name,
    address: branch.address,
    city: branch.city ?? "",
    latitude: branch.latitude,
    longitude: branch.longitude,
    directions: branch.directions ?? "",
    is_main: branch.is_main,
    is_active: branch.is_active,
    use_company_hours: branch.schedules.length === 0,
    schedules: buildDayStates(branch.schedules),
  }
}

/** Semilla desde la dirección general de la empresa (primera sede). */
export function branchFromCompanyAddress(company: { address: string | null; city: string | null }): BranchFormValues {
  return {
    ...defaultBranchValues(true),
    name: "Sede principal",
    address: company.address ?? "",
    city: company.city ?? "",
  }
}

function switchField(
  name: "is_main" | "is_active" | "use_company_hours",
  title: string,
  help: string,
): FieldConfig<BranchFormValues> {
  return createCustomField<BranchFormValues>(
    name,
    ({ value, setValue }) => (
      <div className="flex items-center gap-3">
        <Switch
          id={`branch-${name}`}
          checked={value === true}
          onCheckedChange={(checked: boolean) => setValue(name, checked)}
        />
        <div>
          <Label htmlFor={`branch-${name}`} className="font-medium">
            {title}
          </Label>
          <p className="text-xs text-muted-foreground">{help}</p>
        </div>
      </div>
    ),
    { colSpan: { base: 2 } },
  )
}

export function buildBranchFormFields(
  onSearch: (query: string) => Promise<LocationSuggestion[]>,
): ReadonlyArray<FieldConfig<BranchFormValues>> {
  return [
    createInputField<BranchFormValues>("name", {
      label: "Nombre",
      placeholder: "Chapinero",
      description: "Así la nombra la IA: «nuestra sede de Chapinero».",
      colSpan: { base: 2 },
    }),
    // El buscador rellena dirección, ciudad y coordenadas; el mapa confirma el pin.
    createCustomField<BranchFormValues>(
      "latitude",
      ({ control, setValue, getError }) => (
        <BranchLocationField control={control} setValue={setValue} error={getError()} onSearch={onSearch} />
      ),
      { colSpan: { base: 2 } },
    ),
    createInputField<BranchFormValues>("address", {
      label: "Dirección (como la verá el cliente)",
      placeholder: "Cl 120 # 6A-05",
    }),
    createInputField<BranchFormValues>("city", { label: "Ciudad", placeholder: "Bogotá" }),
    createInputField<BranchFormValues>("directions", {
      label: "Indicaciones para llegar",
      inputKind: "textarea",
      placeholder: "Centro comercial Santa Bárbara, local 2-14, segundo piso.",
      description: "«Al frente de…», «entrada por…». La IA lo repite tal cual.",
      colSpan: { base: 2 },
    }),
    switchField("is_main", "Sucursal principal", "Es la que la IA menciona por defecto. Solo puede haber una."),
    switchField(
      "use_company_hours",
      "Usar el horario de la empresa",
      "Apagado: esta sede define su propio horario.",
    ),
    createCustomField<BranchFormValues>(
      "schedules",
      ({ value, setValue, getError }) => {
        const error = getError()
        return (
          <div className="space-y-2">
            <SchedulesFields value={value as DayState[]} onChange={(days) => setValue("schedules", days)} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )
      },
      { colSpan: { base: 2 }, isVisible: (values) => !values.use_company_hours },
    ),
    switchField("is_active", "Activa", "Inactiva: no aparece para la IA ni para el cliente."),
  ] as const
}

export function toCreateBranchDTO(values: BranchFormValues, countryCode: string): CreateBranchDTO {
  return {
    name: values.name,
    address: values.address,
    country_code: countryCode,
    ...(values.city ? { city: values.city } : {}),
    ...(values.latitude !== null && values.longitude !== null
      ? { latitude: values.latitude, longitude: values.longitude }
      : {}),
    ...(values.directions ? { directions: values.directions } : {}),
    is_main: values.is_main,
    is_active: values.is_active,
  }
}

/** Vaciar ciudad/indicaciones que existían ⇒ `null`; quitar el pin ⇒ ambas coordenadas `null`. */
export function toUpdateBranchDTO(values: BranchFormValues, original: BranchDTO): UpdateBranchDTO {
  const nullable = (next: string | undefined, previous: string | null): string | null | undefined => {
    const clean = next ?? ""
    if (clean.length > 0) return clean
    return previous === null ? undefined : null
  }
  const dto: UpdateBranchDTO = {
    name: values.name,
    address: values.address,
    is_main: values.is_main,
    is_active: values.is_active,
  }
  const city = nullable(values.city, original.city)
  const directions = nullable(values.directions, original.directions)
  if (city !== undefined) dto.city = city
  if (directions !== undefined) dto.directions = directions
  if (values.latitude !== original.latitude || values.longitude !== original.longitude) {
    dto.latitude = values.latitude
    dto.longitude = values.longitude
  }
  return dto
}

/** Horario a enviar en `PUT :id/schedules`: `[]` = heredar el de la empresa. */
export function toBranchScheduleInputs(values: BranchFormValues): ScheduleInput[] {
  return values.use_company_hours ? [] : toScheduleInputs(values.schedules)
}
