"use client"

import { z } from "zod"
import type { FieldConfig } from "@/components/features/dynamic-form"
import { createInputField, createCustomField } from "@/components/features/dynamic-form"

export const characterFormSchema = z.object({
  avatar_url: z.string().url("Debe ser una URL válida").optional().or(z.literal("")).transform(v => (v === "" ? undefined : v)),
  style: z.any().optional(),
  voice: z.any().optional(),
  resources: z.any().optional(),
})

export type CharacterFormValues = z.infer<typeof characterFormSchema>

export const defaultCharacterFormValues: CharacterFormValues = {
  avatar_url: "",
  style: {
    font: "Inter",
    primary_color: "#2E8B57",
    secondary_color: "#F4F4F4",
    chat_bubble_shape: "rounded",
  },
  voice: {
    tone: "friendly",
    speed: 1,
    gender: "female",
    language: "es-CO",
  },
  resources: {
    stickers: [],
    animations: [],
  },
}

export function buildCharacterFormFields(): ReadonlyArray<FieldConfig<CharacterFormValues>> {
  return [
    createInputField<CharacterFormValues>("avatar_url", { label: "Avatar URL", placeholder: "https://...", colSpan: { base: 1, md: 2 } }),
    createCustomField<CharacterFormValues>("style", ({ value, setValue }) => (
      <textarea
        id="df-style"
        className="min-h-[140px] w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono"
        value={JSON.stringify(value ?? {}, null, 2)}
        onChange={(e) => {
          try { setValue("style", JSON.parse(e.target.value) as any) } catch { setValue("style", e.target.value as any) }
        }}
      />
    ), { label: "Style (JSON)" }),
    createCustomField<CharacterFormValues>("voice", ({ value, setValue }) => (
      <textarea
        id="df-voice"
        name="voice"
        className="min-h-[140px] w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono"
        value={JSON.stringify(value ?? {}, null, 2)}
        onChange={(e) => {
          try { setValue("voice", JSON.parse(e.target.value) as any) } catch { setValue("voice", e.target.value as any) }
        }}
      />
    ), { label: "Voice (JSON)" }),
    createCustomField<CharacterFormValues>("resources", ({ value, setValue }) => (
      <textarea
        id="df-resources"
        className="min-h-[140px] w-full px-3 py-2 text-sm rounded-md border border-border bg-background font-mono"
        value={JSON.stringify(value ?? {}, null, 2)}
        onChange={(e) => {
          try { setValue("resources", JSON.parse(e.target.value) as any) } catch { setValue("resources", e.target.value as any) }
        }}
      />
    ), { label: "Resources (JSON)", colSpan: { base: 1, md: 2 } }),
  ] as const
}