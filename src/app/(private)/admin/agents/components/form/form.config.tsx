"use client"

import { z } from "zod"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { SelectOption } from "@/shared/query"
import { Button } from "@/components/ui/button"
import type { CharacterStyleDTO } from "../../characters/model"
import type { FieldConfig } from "@/components/features/dynamic-form"
import { MultiSelect, type MultiSelectOption } from "@/components/features/multi-select"
import { createCustomField, createInputField } from "@/components/features/dynamic-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, AtSign, MessageCircleMore, Phone, Mail, MessageSquareMore, Send, BrainCircuit, Presentation, ServerOff, CircleCheck, ServerCrash, CircleX, ServerCog, MessageCircle, Handshake, Lightbulb, Settings, Headphones, TrendingUp, ShieldCheck, Workflow, Smile, Trash} from "lucide-react"

const channels = [
  { id: "email", label: "Email", icon: <Mail /> },
  { id: "telegram", label: "Telegram", icon: <Send /> },
  { id: "call", label: "Teléfono", icon: <Phone /> },
  { id: "instagram", label: "Instagram", icon: <AtSign /> },
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircleMore /> },
  { id: "messenger", label: "Messenger", icon: <MessageSquareMore /> },
]

const statuses = [
  { id: "available", label: "Disponible", icon: <CircleCheck />},
  { id: "offline", label: "Offline", icon: <CircleX /> },
  { id: "away", label: "Inactivo", icon: <ServerOff />},
  { id: "busy", label: "Ocupado", icon: <ServerCrash/>},
  { id: "meeting", label: "En reunión", icon: <Presentation/>  },
  { id: "on_break", label: "En descanso", icon: <BrainCircuit />},
  { id: "training", label: "En capacitación", icon: <ServerCog /> },
]

const skills: MultiSelectOption[] = [
  { value: "communication_clarity", label: "Comunicación clara", icon: () => <MessageCircle />},
  { value: "empathy", label: "Empatía", icon: () => <Smile />},
  { value: "problem_solving", label: "Resolución de problemas", icon: () => <Lightbulb />},
  { value: "sales_closure", label: "Cierre de ventas", icon: () => <Handshake />},
  { value: "technical_diagnosis", label: "Diagnóstico técnico", icon: () => <Settings />},
  { value: "product_knowledge", label: "Conocimiento del producto", icon: () => <BrainCircuit />},
  { value: "customer_followup", label: "Seguimiento al cliente", icon: () => <Headphones />},
  { value: "process_automation", label: "Automatización de procesos", icon: () => <Workflow />},
  { value: "data_security", label: "Seguridad de datos", icon: () => <ShieldCheck />},
  { value: "sales_growth", label: "Impulso comercial", icon: () => <TrendingUp />},
]

const aiRequirements = [{
  id: 1,
  label: "AI Requirement 1",
}, {
  id: 2,
  label: "AI Requirement 2",
}]

export const agentFormSchema = z.object({
  company_id: z.coerce.number("Selecciona una empresa válida").int().positive(),
  name: z.string().trim().min(1, "Nombre del agente requerido"),
  phone: z.string().trim().min(3, "Teléfono requerido"),
  channel: z.string().trim().min(1, "Canal requerido"),
  status: z.string().trim().optional().default("available"),
  character_id: z.coerce.number("Selecciona un personaje válido").int().positive().nullable(),
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
  skills: [],
  intentions: [],
  channel: "whatsapp",
  status: "available",
  character_id: undefined as unknown as number,
}

export function buildAgentFormFields(opts?: {
  companies?: Array<SelectOption>
  intentions?: Array<SelectOption>
  characters?: Array<SelectOption & { avatar: string, style?: CharacterStyleDTO }>
}): ReadonlyArray<FieldConfig<AgentFormValues>> {
  const defaultCountryCode = "+57"
  const companies = opts?.companies ?? []
  const characters = opts?.characters ?? []
  const intentions = opts?.intentions ?? []

  return [
    createInputField<AgentFormValues>("name", { label: "Nombre", placeholder: "Laura Gómez", inputProps: { autoFocus: true }, autoComplete: "name" }),
    createCustomField<AgentFormValues>("phone", 
      ({ value, setValue }) => {
        return (
          <div className="flex gap-2">
            <span className="bg-gray-100 rounded-md px-2 py-1 select-none">{defaultCountryCode}</span>
            <Input autoComplete="phone" name="phone" id="df-phone" type="tel" value={String(value ?? "")} onChange={(e) => setValue("phone", e.target.value)} />
          </div>
        )
      },
      { label: "Teléfono", htmlFor: "df-phone" }
    ),
    createCustomField<AgentFormValues>("channel", 
      ({ value, setValue }) => (
        <Select name="channel" value={String(value ?? "")} onValueChange={(v: string) => setValue("channel", v as any)}>
          <SelectTrigger id="df-channel">
            <SelectValue placeholder="Selecciona canal" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((c) => (
              <SelectItem 
                key={c.id}
                value={String(c.id)}
                disabled={c.id !== "whatsapp"}
              >
                {c.icon && <span className="mr-2">{c.icon}</span>}
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      { label: "Canal", htmlFor: "df-channel" }
    ),
    createCustomField<AgentFormValues>("company_id",
      ({ value, setValue }) => (
        <Select name="company_id" value={String(value ?? "")} onValueChange={(v: string) => setValue("company_id", Number(v) as any)}>
          <SelectTrigger id="df-company_id">
            <SelectValue placeholder="Selecciona empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      { label: "Empresa", htmlFor: "df-company_id" }
    ),
    createCustomField<AgentFormValues>("status", 
      (({ value, setValue }) => (
        <Select name="status" value={String(value ?? "")} onValueChange={(v: string) => setValue("status", v as any)}>
          <SelectTrigger id="df-status">
            <SelectValue placeholder="Selecciona estado" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.icon && <span className="mr-2">{s.icon}</span>}{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )),
      { label: "Estado", htmlFor: "df-status" }
    ),
    createCustomField<AgentFormValues>("character_id",
      ({ value, setValue }) => (
        <Select name="character_id" value={String(value ?? "")} onValueChange={(v: string) => setValue("character_id", Number(v) as any)}>
          <SelectTrigger id="df-character_id">
            <SelectValue placeholder="Selecciona personaje" />
          </SelectTrigger>
          <SelectContent>
            {characters.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                <div className={cn("rounded-full mr-2 ", c.style?.background)}>
                  <Image src={c.avatar} alt={c.label} width={20} height={20} />
                </div>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      { label: "Personaje", htmlFor: "df-character_id" }
    ),
    createCustomField<AgentFormValues>("skills",
      ({ value, setValue }) => (
        <MultiSelect 
          id="df-skills"
          name="skills"
          options={skills} 
          variant="secondary"
          placeholder="Agrega Skills"
          defaultValue={value as string[]}
          className="border-foreground/10"
          onValueChange={(v: string[]) => setValue("skills", v as any)} 
        />
      ),
      { label: "Habilidades", colSpan: { base: 1, md: 2 } }
    ),
    createCustomField<AgentFormValues>("intentions",
      ({ value, setValue }) => {
        const items = Array.isArray(value) ? value : []
        const remove = (idx: number) => setValue("intentions", items.filter((_, i) => i !== idx) as any)
        const add = () => setValue("intentions", [...items, { intention_id: undefined as unknown as number, requirements: { require_db: false, require_sheet: false, require_catalog: false, require_reminder: false, require_schedule: false } }] as any)
        const update = (idx: number, key: string, v: any) => setValue("intentions", items.map((x, i) => (i === idx ? { ...x, [key]: v } : x)) as any)
        return (
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 border border-foreground/10 rounded-md p-3">
                <Select name="intention_id" value={String(it.intention_id ?? "")} onValueChange={(v: string) => update(i, "intention_id", Number(v) as any)}>
                  <SelectTrigger id="df-intention_id">
                    <SelectValue placeholder="Selecciona intención" />
                  </SelectTrigger>
                  <SelectContent>
                    {intentions.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select name="ai_requirement_id" value={String(it.ai_requirement_id ?? "")} onValueChange={(v: string) => update(i, "ai_requirement_id", Number(v) as any)}>
                  <SelectTrigger id="df-ai_requirement_id">
                    <SelectValue placeholder="Selecciona AI Requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiRequirements.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 justify-center w-full col-span-2">
                  {(["require_db","require_sheet","require_catalog","require_reminder","require_schedule"] as const).map((k) => (
                    <label key={k} className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" name={`df-requirements-${i}-${k}`} id={`df-requirements-${i}-${k}`} checked={Boolean((it.requirements as any)?.[k])} onChange={(e) => update(i, "requirements", { ...(it.requirements as any), [k]: e.target.checked })} />
                      <span>{k.replace("require_", "")}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end md:col-span-2">
                  <Button variant="ghost" type="button" onClick={() => remove(i)}>
                    <Trash />
                    Quitar intención
                  </Button>
                </div>
              </div>
            ))}
            <Button id="df-add-intention" variant="ghost" type="button" onClick={add} className="w-full" >
              <Plus />
              Agregar intención
            </Button>
          </div>
        )
      },
      { label: "Intenciones", colSpan: { base: 1, md: 2 }, htmlFor: "df-add-intention" }
    ),
  ] as const
}