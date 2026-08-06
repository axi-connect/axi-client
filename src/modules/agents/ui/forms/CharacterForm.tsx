"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Info, Mic } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import {
  characterStyle,
  characterVoice,
  type CharacterDTO,
  type CharacterVoice,
  type CreateCharacterDTO,
} from "@/modules/agents/domain/character"
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context"
import {
  createCharacter,
  updateCharacter,
} from "@/modules/agents/infrastructure/services/character-service.adapter"
import { VoiceSelector } from "@/modules/agents/ui/components/VoiceSelector"
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
 *
 * Voz (§10.5 F2): el character elige CÓMO suena — una voz del catálogo curado
 * más ajustes finos opcionales. Sin `voice_id` no hay voz y la política
 * degrada sola a texto; quitar la voz envía `voice: {}`.
 */
const characterFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  avatar_url: z.url("URL inválida").optional().or(z.literal("")),
  background: z.string().trim().optional().or(z.literal("")),
  voice_id: z.string(),
  voice_stability: z.number().min(0).max(1),
  voice_similarity: z.number().min(0).max(1),
  voice_speed: z.number().min(0.7).max(1.2),
})

type CharacterFormValues = z.infer<typeof characterFormSchema>

const VOICE_SETTING_DEFAULTS = { stability: 0.5, similarity_boost: 0.75, speed: 1 } as const

function defaultVoiceValues(character: CharacterDTO | null | undefined) {
  const voice = character ? characterVoice(character) : {}
  return {
    voice_id: typeof voice.voice_id === "string" ? voice.voice_id : "",
    voice_stability: voice.settings?.stability ?? VOICE_SETTING_DEFAULTS.stability,
    voice_similarity: voice.settings?.similarity_boost ?? VOICE_SETTING_DEFAULTS.similarity_boost,
    voice_speed: voice.settings?.speed ?? VOICE_SETTING_DEFAULTS.speed,
  }
}

type CharacterVoiceDto = NonNullable<CreateCharacterDTO["voice"]>

/**
 * `voice` del DTO. El contrato es ESTRICTO (el catálogo curado es invariante
 * del servidor): se envían EXACTAMENTE las claves del schema — nada de merge
 * de claves libres como en `style`. Se preservan `model_id` y `settings.style`
 * existentes porque el form no los edita. Devuelve `undefined` cuando no hay
 * nada que tocar (create sin voz) y `{}` para quitar la voz.
 */
export function buildVoiceDto(
  values: Pick<CharacterFormValues, "voice_id" | "voice_stability" | "voice_similarity" | "voice_speed">,
  existing: CharacterVoice,
): CharacterVoiceDto | undefined {
  if (values.voice_id === "") {
    // Quitar la voz: solo si había algo que quitar
    return typeof existing.voice_id === "string" ? {} : undefined
  }
  return {
    provider: "elevenlabs",
    voice_id: values.voice_id,
    ...(typeof existing.model_id === "string" ? { model_id: existing.model_id } : {}),
    settings: {
      ...(typeof existing.settings?.style === "number" ? { style: existing.settings.style } : {}),
      stability: values.voice_stability,
      similarity_boost: values.voice_similarity,
      speed: values.voice_speed,
    },
  }
}

export type CharacterFormHost = {
  character?: CharacterDTO | null
  onSuccess?: () => void
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string }) => void
}

export function CharacterForm({ host }: { host?: CharacterFormHost }) {
  const isEdit = Boolean(host?.character)
  const [submitting, setSubmitting] = useState(false)
  const { voices, voiceSettings, fetchVoices, fetchVoiceSettings } = useAgent()

  // Al abrir el form, SIEMPRE re-fetch: los preview_url presignados caducan
  // en 1 h y el switch de empresa puede haber cambiado en otra pestaña.
  useEffect(() => {
    void fetchVoices()
    void fetchVoiceSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: {
      name: host?.character?.name ?? "",
      avatar_url: host?.character?.avatar_url ?? "",
      background: host?.character ? String(characterStyle(host.character).background ?? "") : "",
      ...defaultVoiceValues(host?.character),
    },
  })

  const handleSubmit = async (values: CharacterFormValues) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const voice = buildVoiceDto(values, host?.character ? characterVoice(host.character) : {})
      const dto = {
        name: values.name,
        ...(values.avatar_url ? { avatar_url: values.avatar_url } : {}),
        ...(values.background
          ? { style: { ...(host?.character?.style ?? {}), background: values.background } }
          : {}),
        ...(voice !== undefined ? { voice } : {}),
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

  // Desconocido (null) no bloquea: solo un `false` explícito apaga la sección
  const voiceOff = voiceSettings !== null && !voiceSettings.ai_enabled
  const hasVoice = form.watch("voice_id") !== ""

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

        <section className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-accent-violet" aria-hidden />
            <h3 className="text-sm font-semibold">Voz</h3>
            <Badge
              variant="outline"
              className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
            >
              IA
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Cómo suena este character cuando responde notas de voz.
          </p>

          {voiceOff && (
            <p className="flex items-start gap-2 rounded-md border border-accent-violet/25 bg-accent-violet/10 p-3 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0 text-accent-violet" aria-hidden />
              <span>
                La voz está desactivada para tu empresa.{" "}
                <Link href="/settings/voice" className="font-medium text-brand underline-offset-2 hover:underline">
                  Actívala en Configuración → Voz
                </Link>
                .
              </span>
            </p>
          )}

          <fieldset disabled={voiceOff} className={voiceOff ? "opacity-50" : undefined}>
            <div className="space-y-3">
              <FormField
                name="voice_id"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <VoiceSelector
                        voices={voices}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={voiceOff}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Todas las muestras dicen la misma frase: compara el timbre, no el contenido.
              </p>

              {hasVoice && (
                <details className="rounded-md border border-border px-3">
                  <summary className="cursor-pointer py-2.5 text-xs font-medium">
                    Ajustes avanzados de la voz
                  </summary>
                  <div className="space-y-3 pb-3">
                    <VoiceRangeField
                      form={form}
                      name="voice_stability"
                      label="Estabilidad"
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <VoiceRangeField
                      form={form}
                      name="voice_similarity"
                      label="Similitud"
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <VoiceRangeField
                      form={form}
                      name="voice_speed"
                      label="Velocidad"
                      min={0.7}
                      max={1.2}
                      step={0.05}
                      format={(value) => `${value.toFixed(2)}×`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valores recomendados por la voz elegida; ajústalos solo si la escuchas rara.
                    </p>
                  </div>
                </details>
              )}
            </div>
          </fieldset>
        </section>
      </form>
    </Form>
  )
}

/** Range nativo (patrón del repo: AudioPlayerCore / EvaluationActions). */
function VoiceRangeField({
  form,
  name,
  label,
  min,
  max,
  step,
  format = (value) => value.toFixed(2),
}: {
  form: ReturnType<typeof useForm<CharacterFormValues>>
  name: "voice_stability" | "voice_similarity" | "voice_speed"
  label: string
  min: number
  max: number
  step: number
  format?: (value: number) => string
}) {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field }) => (
        <FormItem>
          <div className="grid grid-cols-[96px_1fr_48px] items-center gap-3">
            <FormLabel className="text-xs font-normal">{label}</FormLabel>
            <FormControl>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
                className="h-1 w-full cursor-pointer accent-accent-violet"
                aria-label={label}
                aria-valuetext={format(field.value)}
              />
            </FormControl>
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {format(field.value)}
            </span>
          </div>
        </FormItem>
      )}
    />
  )
}
