"use client"

import { z } from "zod"
import { useOverview } from "../../../../../modules/rbac/infrastructure/overview.context"
import type { FieldConfig } from "@/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/components/features/dynamic-form"

export const moduleFormSchema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres"),
  path: z.string().min(1, "Requerido"),
  is_public: z.boolean().default(false),
  parent_id: z.number().optional(),
  icon: z.string().optional(),
})

export type ModuleFormValues = z.infer<typeof moduleFormSchema>

export const defaultModuleFormValues: ModuleFormValues = {
  name: "",
  path: "",
  is_public: false,
  parent_id: undefined,
  icon: "",
}

export function buildModuleFormFields(): ReadonlyArray<FieldConfig<ModuleFormValues>> {
  return [
    createInputField<ModuleFormValues>("name", { label: "Nombre", placeholder: "Empresas", colSpan: { base: 1, md: 2 }, autoComplete: "off" }),
    createInputField<ModuleFormValues>("path", { label: "Ruta", placeholder: "companies" }),
    createInputField<ModuleFormValues>("icon", { label: "Ícono", placeholder: "LucideIcon" }),
    createCustomField<ModuleFormValues>("is_public", ({ value, setValue }) => (
      <div className="flex gap-2">
        {[
          { v: false, l: "Privado" },
          { v: true, l: "Público" },
        ].map(opt => (
          <button
            type="button"
            key={String(opt.v)}
            id={`df-is_public-${opt.v}`}
            onClick={() => setValue("is_public", opt.v as any)}
            className={`px-3 py-1.5 rounded-full border text-sm ${value === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground/80 border-border"}`}
          >{opt.l}</button>
        ))}
      </div>
    ), { label: "Visibilidad", htmlFor: "df-is_public-true" }),
    createCustomField<ModuleFormValues>("parent_id", ({ setValue, value }) => (
      <div className="w-full">
        <label className="sr-only">Módulo padre</label>
        <select
          id="df-parent_id"
          className="px-2 py-1.5 text-sm rounded-md border border-border bg-background w-full"
          value={String(value ?? "")}
          onChange={(e) => setValue("parent_id", e.target.value ? Number(e.target.value) as any : undefined as any)}
        >
          <option value="">Sin padre</option>
          {useOverview().modules.map(m => (
            <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
          ))}
        </select>
      </div>
    ), { label: "Módulo padre" }),
  ] as const
}