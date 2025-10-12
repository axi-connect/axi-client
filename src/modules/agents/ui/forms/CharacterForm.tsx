"use client"

import { parseHttpError } from "@/core/services/api"
import { useAlert } from "@/core/providers/alert-provider"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { createCharacter, updateCharacter } from "@/modules/agents/infrastructure/character-service.adapter"
import { buildCharacterFormFields, characterFormSchema, defaultCharacterFormValues, type CharacterFormValues } from "@/modules/agents/ui/forms/config/character.config"

export type CharacterFormHost = { defaultValues?: Partial<CharacterFormValues> }

export function CharacterForm({ host, onSuccess }: { host?: CharacterFormHost; onSuccess?: () => void }) {
  const { showAlert } = useAlert()

  async function handleSubmit(values: CharacterFormValues) {
    try {
      const id = (host?.defaultValues as any)?.id
      const payload = {
        avatar_url: values.avatar_url || undefined,
        style: values.style as any,
        voice: values.voice as any,
        resources: values.resources as any,
      }
      const res = id ? await updateCharacter(id, payload) : await createCharacter(payload)
      if (res.successful) {
        showAlert({ tone: "success", title: res.message || (id ? "Personaje actualizado" : "Personaje creado correctamente"), open: true, autoCloseMs: 4000 })
        onSuccess?.()
      } else {
        showAlert({ tone: "error", title: res.message || (id ? "No se pudo actualizar el personaje" : "No se pudo crear el personaje"), open: true })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      const id = (host?.defaultValues as any)?.id
      showAlert({ tone: "error", title: message || (id ? "No se pudo actualizar el personaje" : "No se pudo crear el personaje"), description: status ? `Código: ${status}` : undefined, open: true })
    }
  }

  return (
    <DynamicForm<CharacterFormValues>
      gap={4}
      id="character-form"
      schema={characterFormSchema}
      fields={buildCharacterFormFields()}
      columns={{ base: 1, md: 2 }}
      defaultValues={{ ...defaultCharacterFormValues, ...(host?.defaultValues ?? {}) }}
      onSubmit={handleSubmit}
    />
  )
}