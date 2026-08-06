"use client"

import { z } from "zod"
import Image from "next/image"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AudioLines, Info, TriangleAlert } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { characterHasVoice, characterStyle } from "@/modules/agents/domain/character"
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context"
import { AgentIntentionsEditor } from "@/modules/agents/ui/components/AgentIntentionsEditor"
import {
  createAgent,
  listAiModels,
  setAgentIntentions,
  updateAgent,
} from "@/modules/agents/infrastructure/services/agent-service.adapter"
import {
  AGENT_STATUS_LABELS,
  AI_PROVIDER_LABELS,
  ASSIGNABLE_AI_PROVIDERS,
  agentVoicePolicy,
  type AiAgentDTO,
  type AiModelDTO,
  type CreateAiAgentDTO,
  type UpdateAiAgentDTO,
} from "@/modules/agents/domain/agent"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

/**
 * Formulario de agente IA (`POST/PATCH /ai-agents` + `PUT :id/intentions`).
 * Un agente = prompt + proveedor/modelo + character (persona) + intenciones
 * asignadas + política de handoff a humanos.
 */
const agentFormSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  status: z.enum(["active", "paused", "draft"]),
  provider: z.enum(["openai_compatible", "anthropic"]),
  model: z.string().trim().min(1, "Modelo requerido"),
  system_prompt: z.string().trim().min(10, "El prompt del sistema es el corazón del agente"),
  character_id: z.string().optional(),
  // Numéricos como string en el form (inputs HTML); se parsean en toDto.
  // El tope depende del proveedor (Anthropic corta en 1, OpenAI en 2): el
  // schema valida el rango máximo y el form afina el mensaje con el catálogo
  temperature: z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 2), "Entre 0 y 2")
    .optional(),
  max_tokens: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) > 0), "Entero positivo")
    .optional(),
  handoff_keywords: z.string().trim().optional(),
  max_failures: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 10), "Entre 1 y 10")
    .optional(),
  skills: z.string().trim().optional(),
  // Política de voz (§10.5 F2). El schema del backend es STRICT: toDto
  // re-anida EXACTAMENTE las claves conocidas, jamás claves extra.
  voice_enabled: z.boolean(),
  voice_max_per_conversation: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 20), "Entre 1 y 20")
    .optional(),
  voice_max_chars: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 2000), "Entre 1 y 2000")
    .optional(),
})

type AgentFormValues = z.infer<typeof agentFormSchema>

function splitCsv(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function agentToFormValues(agent: AiAgentDTO): AgentFormValues {
  const handoff = agent.handoff_policy as { keywords?: string[]; max_failures?: number }
  const params = agent.model_params as { temperature?: number; max_tokens?: number }
  const voice = agentVoicePolicy(agent.voice_policy)
  return {
    voice_enabled: voice.enabled,
    voice_max_per_conversation:
      voice.max_per_conversation !== undefined ? String(voice.max_per_conversation) : "",
    voice_max_chars: voice.max_chars !== undefined ? String(voice.max_chars) : "",
    name: agent.name,
    status: agent.status,
    // 'mock' es interno de quality y no se puede asignar desde el panel; sus
    // agentes tampoco aparecen en el listado del tenant. Si llegara uno aquí,
    // se cae al default en vez de mandar un provider que el backend rechaza
    provider: agent.provider === "mock" ? "openai_compatible" : agent.provider,
    model: agent.model,
    system_prompt: agent.system_prompt,
    character_id: agent.character_id ?? undefined,
    temperature: params.temperature !== undefined ? String(params.temperature) : "",
    max_tokens: params.max_tokens !== undefined ? String(params.max_tokens) : "",
    handoff_keywords: (handoff.keywords ?? []).join(", "),
    max_failures: handoff.max_failures !== undefined ? String(handoff.max_failures) : "",
    skills: agent.skills.join(", "),
  }
}

function toDto(values: AgentFormValues): CreateAiAgentDTO {
  return {
    name: values.name,
    status: values.status,
    provider: values.provider,
    model: values.model,
    system_prompt: values.system_prompt,
    ...(values.character_id ? { character_id: values.character_id } : {}),
    skills: splitCsv(values.skills),
    model_params: {
      ...(values.temperature ? { temperature: Number(values.temperature) } : {}),
      ...(values.max_tokens ? { max_tokens: Number(values.max_tokens) } : {}),
    },
    handoff_policy: {
      keywords: splitCsv(values.handoff_keywords),
      ...(values.max_failures ? { max_failures: Number(values.max_failures) } : {}),
    },
    // Reemplazo completo, como handoff_policy. `mode: "mirror"` es el único
    // modo válido hoy: responder con voz solo cuando el cliente usó voz
    voice_policy: {
      enabled: values.voice_enabled,
      mode: "mirror",
      ...(values.voice_max_per_conversation
        ? { max_per_conversation: Number(values.voice_max_per_conversation) }
        : {}),
      ...(values.voice_max_chars ? { max_chars: Number(values.voice_max_chars) } : {}),
    },
  }
}

export type AgentFormHost = {
  /** Agente existente → modo edición. */
  agent?: AiAgentDTO | null
  onSuccess?: () => void
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string }) => void
}

export function AgentForm({ host }: { host?: AgentFormHost }) {
  const isEdit = Boolean(host?.agent)
  const { characters, intentions, voiceSettings, fetchCharacters, fetchIntentions, fetchVoiceSettings } =
    useAgent()
  const [selectedIntentions, setSelectedIntentions] = useState<Set<string>>(
    () => new Set(host?.agent?.intentions.map((i) => i.intention_id) ?? []),
  )
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: host?.agent
      ? agentToFormValues(host.agent)
      : {
          name: "",
          status: "draft",
          provider: "anthropic",
          model: "",
          system_prompt: "",
          character_id: undefined,
          temperature: "",
          max_tokens: "",
          max_failures: "",
          handoff_keywords: "humano, asesor",
          skills: "",
          voice_enabled: false,
          voice_max_per_conversation: "",
          voice_max_chars: "",
        },
  })

  // Catálogo de modelos: lo sirve el backend desde las tarifas vigentes, así
  // que un modelo sin precio ni siquiera es ofrecible (antes era texto libre y
  // un typo creaba un agente que fallaba en cada conversación)
  const [models, setModels] = useState<AiModelDTO[] | null>(null)

  useEffect(() => {
    if (characters.length === 0) void fetchCharacters()
    if (intentions.length === 0) void fetchIntentions()
    // El switch de empresa puede cambiar en otra pestaña: siempre re-fetch
    void fetchVoiceSettings()
    void listAiModels()
      .then((res) => setModels(res.data))
      .catch(() => setModels([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const provider = form.watch("provider")
  const selectedModel = form.watch("model")

  const providerModels = useMemo(
    () => (models ?? []).filter((entry) => entry.provider === provider),
    [models, provider],
  )
  const maxTemperature =
    providerModels.find((entry) => entry.model === selectedModel)?.temperature_max ??
    (provider === "anthropic" ? 1 : 2)
  // Al editar, un modelo retirado del catálogo (tarifa cerrada) seguiría
  // guardado: se muestra marcado en vez de desaparecer sin aviso
  const isOrphanModel =
    models !== null && selectedModel !== "" &&
    !providerModels.some((entry) => entry.model === selectedModel)

  /** Cambiar de proveedor cambia el juego de modelos: se preselecciona su
   * default para no dejar el form en un estado inválido. */
  const handleProviderChange = (next: string) => {
    form.setValue("provider", next as AgentFormValues["provider"])
    const candidates = (models ?? []).filter((entry) => entry.provider === next)
    const preferred = candidates.find((entry) => entry.is_default) ?? candidates[0]
    form.setValue("model", preferred?.model ?? "")
  }

  const handleSubmit = async (values: AgentFormValues) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const intentionsPayload = {
        intentions: [...selectedIntentions].map((intention_id) => {
          // Conserva los requirements existentes al editar.
          const existing = host?.agent?.intentions.find((i) => i.intention_id === intention_id)
          return {
            intention_id,
            ...(existing?.requirements ? { requirements: existing.requirements } : {}),
          }
        }),
      }

      if (isEdit && host?.agent) {
        await updateAgent(host.agent.id, toDto(values) as UpdateAiAgentDTO)
        await setAgentIntentions(host.agent.id, intentionsPayload)
        host?.setAlert?.({ variant: "success", title: "Agente actualizado correctamente" })
      } else {
        const created = await createAgent(toDto(values))
        if (selectedIntentions.size > 0) {
          await setAgentIntentions(created.id, intentionsPayload)
        }
        host?.setAlert?.({ variant: "success", title: "Agente creado correctamente" })
      }
      host?.onSuccess?.()
    } catch (err) {
      if (applyServerValidation(err, form)) return
      host?.setAlert?.({
        variant: "destructive",
        title: errorMessage(err, isEdit ? "No se pudo actualizar el agente" : "No se pudo crear el agente"),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form id="agent-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Asistente de ventas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="status"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(AGENT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="provider"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor</FormLabel>
                <Select value={field.value} onValueChange={handleProviderChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSIGNABLE_AI_PROVIDERS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {AI_PROVIDER_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="model"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={models === null || providerModels.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          models === null
                            ? "Cargando modelos…"
                            : providerModels.length === 0
                              ? "Sin modelos disponibles"
                              : "Elige un modelo"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isOrphanModel ? (
                      <SelectItem value={field.value}>
                        {field.value} (ya no disponible)
                      </SelectItem>
                    ) : null}
                    {providerModels.map((entry) => (
                      <SelectItem key={entry.model} value={entry.model}>
                        {entry.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="system_prompt"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prompt del sistema</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Eres el asistente de la tienda…, atiendes en español, tu objetivo es…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Character (persona visual) */}
        <FormField
          name="character_id"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Character</FormLabel>
              <div className="flex flex-wrap gap-2">
                {characters.map((character) => {
                  const selected = field.value === character.id
                  return (
                    <button
                      type="button"
                      key={character.id}
                      onClick={() => field.onChange(selected ? undefined : character.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition-colors",
                        selected ? "border-brand bg-accent" : "border-border hover:bg-accent/50",
                      )}
                      aria-pressed={selected}
                    >
                      {character.avatar_url ? (
                        <Image
                          src={character.avatar_url}
                          alt={character.name}
                          width={24}
                          height={24}
                          className={cn("h-6 w-6 rounded-full object-cover", characterStyle(character).background)}
                        />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                          {character.name.charAt(0)}
                        </span>
                      )}
                      {character.name}
                    </button>
                  )
                })}
                {characters.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin characters: crea uno desde la galería.</p>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            name="temperature"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperatura</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={maxTemperature}
                    placeholder={`0 a ${String(maxTemperature)}`}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="max_tokens"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Máx. tokens</FormLabel>
                <FormControl>
                  <Input type="number" min={1} placeholder="1024" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="max_failures"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fallos antes de escalar</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={10} placeholder="3" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            name="handoff_keywords"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Palabras de handoff (separadas por coma)</FormLabel>
                <FormControl>
                  <Input placeholder="humano, asesor, persona real" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="skills"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skills (separadas por coma)</FormLabel>
                <FormControl>
                  <Input placeholder="ventas, agendamiento" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <VoicePolicySection form={form} />

        <div>
          <h3 className="mb-2 text-sm font-medium">Intenciones que atiende</h3>
          <AgentIntentionsEditor
            intentions={intentions}
            selected={selectedIntentions}
            onChange={setSelectedIntentions}
          />
        </div>
      </form>
    </Form>
  )
}

/**
 * Política de voz del agente (§10.5 F2): CUÁNDO habla. Con el switch de
 * empresa apagado la sección se DESHABILITA con explicación — nunca se oculta
 * sin decir por qué. Si el character elegido no tiene voz, se avisa: la
 * política degradaría a texto en silencio.
 */
function VoicePolicySection({ form }: { form: ReturnType<typeof useForm<AgentFormValues>> }) {
  const { characters, voiceSettings } = useAgent()
  // Desconocido (null) no bloquea: solo un `false` explícito apaga la sección
  const voiceOff = voiceSettings !== null && !voiceSettings.ai_enabled
  const enabled = form.watch("voice_enabled")
  const characterId = form.watch("character_id")
  const character = characters.find((entry) => entry.id === characterId)
  const missingVoice = enabled && (character === undefined || !characterHasVoice(character))

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <AudioLines className="size-4 text-accent-violet" aria-hidden />
        <h3 className="text-sm font-semibold">Notas de voz</h3>
        <Badge
          variant="outline"
          className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
        >
          IA
        </Badge>
      </div>

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

      <fieldset disabled={voiceOff} className={cn("space-y-3", voiceOff && "opacity-50")}>
        <FormField
          name="voice_enabled"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <FormLabel>Responder con notas de voz</FormLabel>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Solo cuando el cliente le habla con audio (espejo). Las respuestas largas o con
                    enlaces salen en texto.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Responder con notas de voz"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {missingVoice && (
          <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              {character === undefined ? (
                <>Elige un character con voz: sin él, el agente seguirá respondiendo por texto.</>
              ) : (
                <>
                  El character <span className="font-medium">{character.name}</span> aún no tiene voz
                  elegida — el agente seguirá respondiendo por texto.{" "}
                  <Link
                    href={`/admin/agents/characters/update/${character.id}`}
                    className="font-medium text-brand underline-offset-2 hover:underline"
                  >
                    Elegir voz del character
                  </Link>
                  .
                </>
              )}
            </span>
          </p>
        )}

        {enabled && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              name="voice_max_per_conversation"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. notas por conversación</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={20} placeholder="6" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Entre 1 y 20 · cortesía con el cliente y control de costo.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="voice_max_chars"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Largo máx. por nota (caracteres)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={2000} placeholder="600" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Opcional: si lo dejas vacío aplica el tope de la plataforma.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </fieldset>
    </section>
  )
}
