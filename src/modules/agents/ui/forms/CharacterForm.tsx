"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/shared/components/ui/input"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { characterStyle, type CharacterDTO } from "@/modules/agents/domain/character"
import {
  createCharacter,
  updateCharacter,
} from "@/modules/agents/infrastructure/services/character-service.adapter"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"

/**
 * Formulario de character (`POST/PATCH /ai-characters`). El `style` del
 * backend es JSON libre; la UI gestiona `style.background` (clase Tailwind
 * usada por la galería y el selector del agente).
 */
const characterFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  avatar_url: z.url("URL inválida").optional().or(z.literal("")),
  background: z.string().trim().optional().or(z.literal("")),
})

type CharacterFormValues = z.infer<typeof characterFormSchema>

export type CharacterFormHost = {
  character?: CharacterDTO | null
  onSuccess?: () => void
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string }) => void
}

export function CharacterForm({ host }: { host?: CharacterFormHost }) {
  const isEdit = Boolean(host?.character)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: {
      name: host?.character?.name ?? "",
      avatar_url: host?.character?.avatar_url ?? "",
      background: host?.character ? String(characterStyle(host.character).background ?? "") : "",
    },
  })

  const handleSubmit = async (values: CharacterFormValues) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const dto = {
        name: values.name,
        ...(values.avatar_url ? { avatar_url: values.avatar_url } : {}),
        ...(values.background
          ? { style: { ...(host?.character?.style ?? {}), background: values.background } }
          : {}),
      }
      if (isEdit && host?.character) {
        await updateCharacter(host.character.id, dto)
        host?.setAlert?.({ variant: "success", title: "Character actualizado correctamente" })
      } else {
        await createCharacter(dto)
        host?.setAlert?.({ variant: "success", title: "Character creado correctamente" })
      }
      host?.onSuccess?.()
    } catch (err) {
      if (applyServerValidation(err, form)) return
      host?.setAlert?.({
        variant: "destructive",
        title: errorMessage(err, isEdit ? "No se pudo actualizar el character" : "No se pudo crear el character"),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form id="character-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Aria" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="avatar_url"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar (URL)</FormLabel>
              <FormControl>
                <Input placeholder="https://…/avatar.png" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="background"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fondo (clase Tailwind)</FormLabel>
              <FormControl>
                <Input placeholder="bg-rose-200" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
