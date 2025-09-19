"use client"

import { z } from "zod"
import type { FieldConfig } from "@/components/dynamic-form"
import { createCustomField, createInputField } from "@/components/dynamic-form"
import type { CreateRoleDTO, RbacModuleSummaryDTO, RbacPermission } from "../../model"

export const roleFormSchema = z.object({
  name: z.string().min(1, "Requerido"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  hierarchy_level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  permissions: z.array(z.object({
    module_id: z.number(),
    permission: z.array(z.enum(["read","create","delete","update"]))
  })).min(1, "Agrega al menos un permiso"),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

export const defaultRoleFormValues: RoleFormValues = {
  name: "",
  description: "",
  status: "active",
  hierarchy_level: 0,
  permissions: [],
}

const StatusMap = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
] as const

const HierarchyMap: ReadonlyArray<{ value: 0|1|2|3; label: string }> = [
  { value: 0, label: "Base" },
  { value: 1, label: "Operador" },
  { value: 2, label: "Supervisor" },
  { value: 3, label: "Administrador" },
]

const Perms: RbacPermission[] = ["read", "create", "delete", "update"]

export function buildRoleFormFields(modules: RbacModuleSummaryDTO[]): ReadonlyArray<FieldConfig<RoleFormValues>> {
  const moduleOptions = modules.map(m => ({ value: m.id, label: `${m.name} (${m.code})` }))

  return [
    createInputField<RoleFormValues>("name", { label: "Nombre del rol", placeholder: "Administrador", autoComplete: "off"}),

    createCustomField<RoleFormValues>("status", ({ value, setValue}) => (
      <div className="flex gap-2">
        {StatusMap.map(s => (
          <button
            key={s.value}
            type="button"
            id={`df-status-${s.value}`}
            onClick={() => setValue("status", s.value as any)}
            className={`cursor-pointer px-3 py-1.5 rounded-full border text-sm ${value === s.value ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground/80 border-border"}`}
          >{s.label}</button>
        ))}
      </div>
    ), { label: "Estado", htmlFor: "df-status-active"}),

    createCustomField<RoleFormValues>("hierarchy_level", ({ value, setValue }) => (
      <div className="flex flex-wrap gap-2">
        {HierarchyMap.map(h => (
          <button
            key={h.value}
            type="button"
            id={`df-hierarchy_level-${h.value}`}
            onClick={() => setValue("hierarchy_level", h.value as any)}
            className={`cursor-pointer px-3 py-1.5 rounded-full border text-sm ${value === h.value ? "bg-accent text-accent-foreground border-accent" : "bg-secondary text-foreground/80 border-border"}`}
          >{h.label}</button>
        ))}
      </div>
    ), { label: "Jerarquía", htmlFor: "df-hierarchy_level-0"}),

    createCustomField<RoleFormValues>("description", ({ value, setValue }) => (
      <textarea
        rows={4}
        id="df-description"
        value={String(value ?? "")}
        onChange={(e) => setValue("description", e.target.value as any)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Descripción del rol"
      />
    ), { label: "Descripción"}),

    createCustomField<RoleFormValues>("permissions", ({ value, setValue }) => {
      const items = (value ?? []) as RoleFormValues["permissions"]
      const updateItem = (i: number, patch: Partial<RoleFormValues["permissions"][number]>) => {
        const next = items.slice()
        next[i] = { ...next[i], ...patch }
        setValue("permissions", next as any)
      }
      const addItem = () => setValue("permissions", [...(items || []), { module_id: moduleOptions[0]?.value ?? 0, permission: ["read"] }] as any)
      const removeItem = (i: number) => setValue("permissions", items.filter((_, idx) => idx !== i) as any)

      return (
        <div className="space-y-3">
          {items?.map((it, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <select
                  value={it.module_id}
                  id={`df-permissions-${i}`}
                  className="px-2 py-1.5 text-sm rounded-md border border-border bg-background"
                  onChange={(e) => updateItem(i, { module_id: Number(e.target.value) })}
                >
                  {moduleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button type="button" className="text-xs text-red-600" onClick={() => removeItem(i)}>Eliminar</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Perms.map(p => {
                  const active = it.permission.includes(p)
                  const toggle = () => {
                    const next = active ? it.permission.filter(x => x !== p) : [...it.permission, p]
                    updateItem(i, { permission: next })
                  }
                  return (
                    <button key={p} type="button" onClick={toggle} className={`px-2 py-1 rounded-full border text-[12px] ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground/80 border-border"}`}>{p}</button>
                  )
                })}
              </div>
            </div>
          ))}
          <button id="df-add-permission" type="button" onClick={addItem} className="cursor-pointer text-sm px-3 py-1.5 rounded-md border border-dashed">Agregar permiso</button>
        </div>
      )
    }, { label: "Permisos", htmlFor: "df-add-permission" }),
  ] as const
}

export function toCreateRoleDTO(values: RoleFormValues): CreateRoleDTO {
  return { ...values }
}