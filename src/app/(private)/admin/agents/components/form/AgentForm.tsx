"use client"

import { useEffect, useState } from "react"
import { parseHttpError } from "@/shared/api"
import { DynamicForm } from "@/components/features/dynamic-form"
import { createAgent } from "../../services"
import { listCharacters } from "../../characters/service"
import type { AgentFormValues } from "./form.config"
import { agentFormSchema, buildAgentFormFields, defaultAgentFormValues } from "./form.config"
import { listCompanyOptions } from "@/app/(private)/admin/users/service"
import { listIntention } from "../../intentions/service"

export type AgentFormHost = {
  closeModal?: () => void
  refresh?: () => Promise<void> | void
  defaultValues?: Partial<AgentFormValues>
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void
}

export function AgentForm({ host }: { host?: AgentFormHost }) {
  const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([])
  const [characters, setCharacters] = useState<Array<{ id: number; label: string }>>([])
  const [intentions, setIntentions] = useState<Array<{ id: number; label: string }>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [companyOpts, charsRes, intentRes] = await Promise.all([
          listCompanyOptions({ limit: 100 }),
          listCharacters({ limit: 100, offset: 0, sortBy: "id", sortDir: "desc", view: "summary" }),
          listIntention({ limit: 100, offset: 0, sortBy: "id", sortDir: "asc", view: "summary" }),
        ])
        if (!cancelled) {
          setCompanies(companyOpts)
          setCharacters((charsRes.data?.characters ?? []).map(c => ({ id: Number(c.id), label: String(c.id) })))
          setIntentions((intentRes.data?.intentions ?? []).map(i => ({ id: Number(i.id), label: `${i.code} — ${i.flow_name}` })))
        }
      } catch (err) {
        console.error(err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(values: AgentFormValues) {
    try {
      const res = await createAgent({
        company_id: values.company_id,
        name: values.name,
        phone: values.phone,
        channel: values.channel,
        status: values.status,
        character_id: values.character_id,
        skills: values.skills,
        intentions: values.intentions,
      })
      if (res.successful) {
        host?.setAlert?.({ variant: "success", title: res.message || "Agente creado correctamente" })
        await host?.refresh?.()
        host?.closeModal?.()
      } else {
        host?.setAlert?.({ variant: "destructive", title: res.message || "No se pudo crear el agente" })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      host?.setAlert?.({ variant: "destructive", title: message || "No se pudo crear el agente", description: status ? `Código: ${status}` : undefined })
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
      defaultValues={{ ...defaultAgentFormValues, ...(host?.defaultValues ?? {}) }}
    />
  )
}