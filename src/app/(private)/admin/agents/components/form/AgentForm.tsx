"use client"

import { useEffect, useState } from "react"
import { parseHttpError } from "@/shared/api"
import { SelectOption } from "@/shared/query"
import type { AgentFormValues } from "./form.config"
import { listIntention } from "../../intentions/service"
import { createAgent, updateAgent } from "../../service"
import { listCharacters } from "../../characters/service"
import { listCompanyOptions } from "../../../companies/service"
import { useAlert } from "@/components/providers/alert-provider"
import type { CharacterStyleDTO } from "../../characters/model"
import { DynamicForm } from "@/components/features/dynamic-form"
import { agentFormSchema, buildAgentFormFields, defaultAgentFormValues } from "./form.config"

export type AgentFormHost = {
  onSuccess: () => void
  defaultValues?: Partial<AgentFormValues>
}

const cache = new Map<string, Array<SelectOption>>()
type CharacterOption = SelectOption & { avatar: string, style?: CharacterStyleDTO }

export function AgentForm({ host }: { host: AgentFormHost }) {
  const { showAlert } = useAlert()
  const [companies, setCompanies] = useState<Array<SelectOption>>(cache.get("companies") ?? [])
  const [computedDefaults, setComputedDefaults] = useState<Partial<AgentFormValues> | null>(null)
  const [intentions, setIntentions] = useState<Array<SelectOption>>(cache.get("intentions") ?? [])
  const [characters, setCharacters] = useState<Array<CharacterOption>>(cache.get("characters") as Array<CharacterOption> ?? [])

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (cache.has("companies") && cache.has("characters") && cache.has("intentions")) return
        const [companyOpts, charsRes, intentRes] = await Promise.all([
          listCompanyOptions({ limit: 100 }),
          listCharacters({ limit: 100, offset: 0, sortBy: "id", sortDir: "desc", view: "summary" }),
          listIntention({ limit: 100, offset: 0, sortBy: "id", sortDir: "asc", view: "summary" }),
        ])
        if (!cancelled) {
          console.log(companyOpts, charsRes, intentRes)
          cache.set("companies", companyOpts)
          cache.set("characters", (charsRes.data?.characters ?? []).map(c => ({ id: Number(c.id), label: c.voice?.gender === "female" ? "Mujer" : "Hombre", avatar: c.avatar_url, style: c.style })))
          cache.set("intentions", (intentRes.data?.intentions ?? []).map(i => ({ id: Number(i.id), label: `${i.code} — ${i.flow_name}` })))
          setCompanies(cache.get("companies") ?? [])
          setIntentions(cache.get("intentions") ?? [])
          setCharacters(cache.get("characters") as Array<CharacterOption> ?? [])
        }
      } catch (err) {
        console.error(err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setComputedDefaults(toFormDefaults(host?.defaultValues))
  }, [host?.defaultValues])

  async function handleSubmit(values: AgentFormValues) {
    try {
      const id = (host?.defaultValues as any)?.id
      const payload = {
        ...values,
        phone: `+57${values.phone}`,
        character_id: values.character_id ?? undefined,
      }
      const res = id ? await updateAgent(id, payload) : await createAgent(payload)

      if (res.successful) {
        showAlert({ tone: "success", title: res.message || "Agente creado correctamente", open: true, autoCloseMs: 4000 })
        host.onSuccess()
      } else {
        showAlert({ tone: "error", title: res.message || "No se pudo crear el agente", open: true })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      showAlert({ tone: "error", title: message || "No se pudo crear el agente", description: status ? `Código: ${status}` : undefined, open: true })
    }
  }

  const toFormDefaults = (input?: Partial<AgentFormValues> | any): Partial<AgentFormValues> => {
    if (!input) return {}
    const stripCountry = (ph?: string) => {
      if (!ph) return ""
      if (ph.startsWith("+57")) return ph.replace(/^\+57/, "")
      return ph.replace(/^\+/, "")
    }
    const intentions = Array.isArray((input as any).agentIntention)
    ? (input as any).agentIntention.map((it: any) => ({
      intention_id: Number(it.intention_id ?? it.intention?.id ?? 0),
      ai_requirement_id: it.ai_requirement_id != null ? Number(it.ai_requirement_id) : undefined,
      requirements: {
        require_db: Boolean(it.requirements?.require_db),
        require_sheet: Boolean(it.requirements?.require_sheet),
        require_catalog: Boolean(it.requirements?.require_catalog),
        require_reminder: Boolean(it.requirements?.require_reminder),
        require_schedule: Boolean(it.requirements?.require_schedule),
      },
    }))
    : (input as any).intentions

    return {
      ...input,
      phone: stripCountry((input as any).phone ?? ""),
      skills: Array.isArray((input as any).skills) ? (input as any).skills.map((s: any) => String(s)) : [],
      intentions: Array.isArray(intentions) ? intentions : [],
    }
  }

  return (
    <DynamicForm<AgentFormValues>
      gap={4}
      id="agent-form"
      onSubmit={handleSubmit}
      schema={agentFormSchema}
      columns={{ sm: 1, md: 2 }}
      fields={buildAgentFormFields({ companies, characters, intentions })}
      defaultValues={{ ...defaultAgentFormValues, ...computedDefaults }}
    />
  )
}