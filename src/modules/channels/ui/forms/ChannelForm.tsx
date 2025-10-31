"use client"

import { SelectOption } from "@/shared/api/query"
import { parseHttpError } from "@/core/services/api"
import { useCallback, useEffect, useState } from "react"
import { useAlert } from "@/core/providers/alert-provider"
import { AgentOption } from "@/modules/agents/domain/agent"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { listAgentSummary } from "@/modules/agents/infrastructure/services/agent-service.adapter"
import { createChannel, updateChannel } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import { buildChannelFormFields, channelFormSchema, useDefaultChannelFormValues, type ChannelFormValues } from "./config/channel.config"

export type ChannelFormHost = {
  id?: string
  defaultValues?: Partial<ChannelFormValues>
}

const cache = new Map<string, Array<SelectOption>>()

export function ChannelForm({ host, onSuccess }: { host?: ChannelFormHost; onSuccess?: () => void }) {
  const { showAlert } = useAlert()
  const [agents, setAgents] = useState<Array<AgentOption>>(cache.get("agents") as Array<AgentOption> ?? [])

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (cache.has("agents")) return
        const res = await listAgentSummary({ limit: 100, offset: 0, sortBy: "id", sortDir: "desc", view: "summary" })
        if (!cancelled) {
          cache.set("agents", (res.data?.agents ?? []).map(a => ({ id: Number(a.id), label: a.name, avatar: a.character.avatar_url, style: a.character.style })))
          setAgents(cache.get("agents") as Array<AgentOption> ?? [])
        }
      } catch (err) {
        console.error(err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = useCallback(async (values: ChannelFormValues) => {
    try {
      const res = host?.id
        ? await updateChannel(host.id, values)
        : await createChannel(values)
      if (res.successful) {
        showAlert({ tone: "success", title: res.message || (host?.id ? "Canal actualizado" : "Canal creado"), open: true, autoCloseMs: 3500 })
        onSuccess?.()
      } else {
        showAlert({ tone: "error", title: res.message || "No se pudo completar la operación", open: true })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      showAlert({ tone: "error", title: message || "No se pudo completar la operación", description: status ? `Código: ${status}` : undefined, open: true })
    }
  }, [host?.id, onSuccess, showAlert])

  return (
    <DynamicForm<ChannelFormValues>
      gap={4}
      id="channels-form"
      onSubmit={handleSubmit}
      schema={channelFormSchema}
      columns={{ base: 1, md: 2 }}
      fields={buildChannelFormFields(agents)}
      defaultValues={{ ...useDefaultChannelFormValues(), ...(host?.defaultValues ?? {}) }}
    />
  )
}

export default ChannelForm