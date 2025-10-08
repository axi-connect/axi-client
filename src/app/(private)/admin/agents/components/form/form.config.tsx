"use client"

import { z } from "zod"
import type { FieldConfig } from "@/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/components/features/dynamic-form"

export const agentFormSchema = z.object({
  company_id: z.coerce.number().int().positive("Selecciona una empresa válida"),
  name: z.string().trim().min(1, "Nombre del agente requerido"),
  phone: z.string().trim().min(3, "Teléfono requerido"),
  channel: z.string().trim().min(1, "Canal requerido"),
  status: z.string().trim().optional().default("available"),
  character_id: z.coerce.number().int().positive().optional(),
  skills: z.array(z.string().trim()).optional().default([]),
  intentions: z
    .array(
      z.object({
        intention_id: z.coerce.number().int().positive("Selecciona una intención válida"),
        ai_requirement_id: z.coerce.number().int().positive().optional(),
        requirements: z.object({
          require_db: z.boolean().default(false),
          require_sheet: z.boolean().default(false),
          require_catalog: z.boolean().default(false),
          require_reminder: z.boolean().default(false),
          require_schedule: z.boolean().default(false),
        }),
      })
    )
    .optional()
    .default([]),
})

export type AgentFormValues = z.infer<typeof agentFormSchema>

export const defaultAgentFormValues: AgentFormValues = {
  company_id: undefined as unknown as number,
  name: "",
  phone: "",
  channel: "whatsapp",
  status: "available",
  character_id: undefined,
  skills: [],
  intentions: [],
}

export function buildAgentFormFields(opts?: {
  companies?: Array<{ id: number; name: string }>
  characters?: Array<{ id: number; label: string }>
  intentions?: Array<{ id: number; label: string }>
}): ReadonlyArray<FieldConfig<AgentFormValues>> {
  const companies = opts?.companies ?? []
  const characters = opts?.characters ?? []
  const intentions = opts?.intentions ?? []

  return [
    createInputField<AgentFormValues>("company_id", {
      label: "Empresa",
      placeholder: "Selecciona empresa",
      inputKind: "number",
      colSpan: { base: 1, md: 1 },
      description: companies.length ? undefined : "Cargar opciones de empresa",
    }),
    createInputField<AgentFormValues>("name", { label: "Nombre", placeholder: "Laura Gómez", inputProps: { autoFocus: true } }),
    createInputField<AgentFormValues>("phone", { label: "Teléfono", placeholder: "+57321..." }),
    createInputField<AgentFormValues>("channel", { label: "Canal", placeholder: "whatsapp" }),
    createInputField<AgentFormValues>("status", { label: "Estado", placeholder: "available" }),
    createInputField<AgentFormValues>("character_id", { label: "Personaje (opcional)", placeholder: "ID del personaje", inputKind: "number" }),
    createCustomField<AgentFormValues>(
      "skills",
      ({ value, setValue }) => {
        const items = Array.isArray(value) ? value : []
        const remove = (idx: number) => setValue("skills", items.filter((_, i) => i !== idx) as any)
        const add = () => setValue("skills", [...items, ""] as any)
        const update = (idx: number, v: string) => setValue("skills", items.map((x, i) => (i === idx ? v : x)) as any)
        return (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 input input-bordered" value={it} onChange={(e) => update(i, e.target.value)} placeholder="Habilidad" />
                <button type="button" className="button" onClick={() => remove(i)}>Quitar</button>
              </div>
            ))}
            <button type="button" className="button" onClick={add}>Agregar habilidad</button>
          </div>
        )
      },
      { label: "Habilidades", colSpan: { base: 1, md: 2 } }
    ),
    createCustomField<AgentFormValues>(
      "intentions",
      ({ value, setValue }) => {
        const items = Array.isArray(value) ? value : []
        const remove = (idx: number) => setValue("intentions", items.filter((_, i) => i !== idx) as any)
        const add = () => setValue("intentions", [...items, { intention_id: undefined as unknown as number, requirements: { require_db: false, require_sheet: false, require_catalog: false, require_reminder: false, require_schedule: false } }] as any)
        const update = (idx: number, key: string, v: any) => setValue("intentions", items.map((x, i) => (i === idx ? { ...x, [key]: v } : x)) as any)
        return (
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-md p-3">
                <input className="input input-bordered" placeholder="ID Intención" value={String(it.intention_id ?? "")} onChange={(e) => update(i, "intention_id", Number(e.target.value))} />
                <input className="input input-bordered" placeholder="AI Requirement Id (opcional)" value={String(it.ai_requirement_id ?? "")} onChange={(e) => update(i, "ai_requirement_id", Number(e.target.value))} />
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-2">
                  {(["require_db","require_sheet","require_catalog","require_reminder","require_schedule"] as const).map((k) => (
                    <label key={k} className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean((it.requirements as any)?.[k])} onChange={(e) => update(i, "requirements", { ...(it.requirements as any), [k]: e.target.checked })} />
                      <span>{k.replace("require_", "")}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end md:col-span-2">
                  <button type="button" className="button" onClick={() => remove(i)}>Quitar intención</button>
                </div>
              </div>
            ))}
            <button type="button" className="button" onClick={add}>Agregar intención</button>
          </div>
        )
      },
      { label: "Intenciones", colSpan: { base: 1, md: 2 } }
    ),
  ] as const
}