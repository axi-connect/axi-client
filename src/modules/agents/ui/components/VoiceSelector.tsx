"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, ChevronsUpDown, Loader2, MicOff, Play, Square } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { voiceGenderLabel, type AiVoiceDTO } from "@/modules/agents/domain/voice"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

/** Valor interno del item "Sin voz" para el filtrado de cmdk. */
const NO_VOICE = "__none__"

/**
 * Selector de voz del catálogo curado (§10.5 F2). Single-select controlado
 * sobre Popover + Command (patrón de `features/multi-select`, sin heredar su
 * API multi). Cada opción lleva un preview de audio: un solo `<audio>` para
 * todo el selector — nunca suenan dos voces a la vez. Todas las muestras
 * dicen la misma frase de marca: se compara timbre, no contenido.
 */
export function VoiceSelector({
  voices,
  value,
  onChange,
  disabled = false,
}: {
  /** Catálogo (`GET /ai-voices`); `null` = cargando. */
  voices: AiVoiceDTO[] | null
  /** `external_voice_id` elegido; `""` = sin voz (responde solo texto). */
  value: string
  onChange: (voiceId: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Voz sonando o cargando su muestra; un id a la vez. */
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const stopPreview = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setPreviewingId(null)
    setPreviewLoading(false)
  }, [])

  // Cerrar el selector (o desmontarlo) silencia el preview.
  useEffect(() => {
    if (!open) stopPreview()
    return stopPreview
  }, [open, stopPreview])

  const togglePreview = (voice: AiVoiceDTO) => {
    const wasPlaying = previewingId === voice.external_voice_id
    stopPreview()
    if (wasPlaying || !voice.preview_url) return

    const audio = new Audio(voice.preview_url)
    audioRef.current = audio
    setPreviewingId(voice.external_voice_id)
    setPreviewLoading(true)
    audio.onplaying = () => setPreviewLoading(false)
    audio.onended = stopPreview
    audio.onerror = stopPreview
    // En jsdom `play()` devuelve undefined (no implementado): el cast evita
    // un TypeError en tests sin tocar el comportamiento del navegador
    const playback = audio.play() as Promise<void> | undefined
    void playback?.catch(stopPreview)
  }

  const selected = voices?.find((voice) => voice.external_voice_id === value)
  // Voz guardada que ya no está en el catálogo: se muestra, no se esconde
  // (mismo trato que un modelo retirado en AgentForm).
  const isOrphan = value !== "" && voices !== null && selected === undefined

  const triggerLabel =
    value === ""
      ? "Sin voz — responde solo texto"
      : (selected?.name ?? `${value} (ya no disponible)`)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Voz del character"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-colors",
            "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
            disabled && "pointer-events-none opacity-50",
            value === "" && "text-muted-foreground",
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar voz…" />
          <CommandList>
            <CommandEmpty>Sin voces para esa búsqueda.</CommandEmpty>
            {voices === null ? (
              <div
                className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
                role="status"
                aria-label="Cargando voces"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando voces…
              </div>
            ) : (
              <CommandGroup>
                <CommandItem
                  value={NO_VOICE}
                  onSelect={() => {
                    onChange("")
                    setOpen(false)
                  }}
                >
                  <MicOff className="size-4 text-muted-foreground" aria-hidden />
                  <span className="flex-1">Sin voz — responde solo texto</span>
                  {value === "" && <Check className="size-4 text-accent-violet" aria-hidden />}
                </CommandItem>
                {isOrphan && (
                  <CommandItem value={value} disabled>
                    <span className="flex-1 truncate text-muted-foreground">
                      {value} (ya no disponible)
                    </span>
                    <Check className="size-4 text-accent-violet" aria-hidden />
                  </CommandItem>
                )}
                {voices.map((voice) => (
                  <CommandItem
                    key={voice.id}
                    value={`${voice.name} ${voice.description ?? ""}`}
                    onSelect={() => {
                      onChange(voice.external_voice_id)
                      setOpen(false)
                    }}
                    className="items-start gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {voice.name}
                        {value === voice.external_voice_id && (
                          <Check className="size-3.5 text-accent-violet" aria-hidden />
                        )}
                      </p>
                      {voice.description && (
                        <p className="truncate text-xs text-muted-foreground">{voice.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {[voiceGenderLabel(voice.gender), voice.accent].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <VoicePreviewButton
                      voice={voice}
                      playing={previewingId === voice.external_voice_id}
                      loading={previewLoading && previewingId === voice.external_voice_id}
                      onToggle={() => togglePreview(voice)}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Play/stop de la muestra. Detiene la propagación para no seleccionar la voz
 * al escucharla; sin `preview_url` queda deshabilitado y explicado. */
function VoicePreviewButton({
  voice,
  playing,
  loading,
  onToggle,
}: {
  voice: AiVoiceDTO
  playing: boolean
  loading: boolean
  onToggle: () => void
}) {
  const button = (
    <button
      type="button"
      disabled={voice.preview_url === null}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
        playing
          ? "border-transparent bg-accent-violet text-white"
          : "border-accent-violet/30 text-accent-violet hover:bg-accent-violet/10",
        voice.preview_url === null && "cursor-not-allowed opacity-40",
      )}
      aria-label={
        voice.preview_url === null
          ? `Muestra de ${voice.name} pendiente`
          : playing
            ? `Detener muestra de ${voice.name}`
            : `Escuchar muestra de ${voice.name}`
      }
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : playing ? (
        <Square className="size-3 fill-current" aria-hidden />
      ) : (
        <Play className="size-3.5 translate-x-px fill-current" aria-hidden />
      )}
    </button>
  )

  if (voice.preview_url !== null) return button
  return (
    <Tooltip>
      {/* El disabled mata los eventos de puntero: el wrapper recibe el hover */}
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>Muestra pendiente</TooltipContent>
    </Tooltip>
  )
}
