"use client"

import { useCallback } from "react"
import { parseHttpError } from "@/core/services/api"
import { useAlert } from "@/core/providers/alert-provider"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { createChannel, updateChannel } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import { buildChannelFormFields, channelFormSchema, useDefaultChannelFormValues, type ChannelFormValues } from "./config/channel.config"

export type ChannelFormHost = {
  id?: string
  defaultValues?: Partial<ChannelFormValues>
}

export function ChannelForm({ host, onSuccess }: { host?: ChannelFormHost; onSuccess?: () => void }) {
  const { showAlert } = useAlert()

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
      schema={channelFormSchema}
      fields={buildChannelFormFields()}
      columns={{ base: 1, md: 2 }}
      defaultValues={{ ...useDefaultChannelFormValues(), ...(host?.defaultValues ?? {}) }}
      onSubmit={handleSubmit}
    />
  )
}

export default ChannelForm