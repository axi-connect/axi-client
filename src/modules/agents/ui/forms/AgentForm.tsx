"use client"

import { z } from "zod"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/core/lib/utils"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { characterStyle } from "@/modules/agents/domain/character"
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context"
import { AgentIntentionsEditor } from "@/modules/agents/ui/components/AgentIntentionsEditor"
import {
  createAgent,
  setAgentIntentions,
  updateAgent,
} from "@/modules/agents/infrastructure/services/agent-service.adapter"
import {
  AGENT_STATUS_LABELS,
  AI_PROVIDER_LABELS,
  type AiAgentDTO,
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
})

type AgentFormValues = z.infer<typeof agentFormSchema>

const MODEL_PLACEHOLDERS: Record<AgentFormValues["provider"], string> = {
  anthropic: "claude-sonnet-5",
  openai_compatible: "gpt-4o-mini",
}

function splitCsv(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function agentToFormValues(agent: AiAgentDTO): AgentFormValues {
  const handoff = agent.handoff_policy as { keywords?: string[]; max_failures?: number }
  const params = agent.model_params as { temperature?: number; max_tokens?: number }
  return {
    name: agent.name,
    status: agent.status,
    // 'mock' es interno del módulo quality y el form no lo ofrece: al editar
    // un agente mock (no ocurre desde la UI) se cae al provider por defecto
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
  const { characters, intentions, fetchCharacters, fetchIntentions } = useAgent()
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
        },
  })

  useEffect(() => {
    if (characters.length === 0) void fetchCharacters()
    if (intentions.length === 0) void fetchIntentions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const provider = form.watch("provider")

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
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(AI_PROVIDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
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
                <FormControl>
                  <Input placeholder={MODEL_PLACEHOLDERS[provider]} {...field} />
                </FormControl>
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
                  <Input type="number" step="0.1" min={0} max={2} placeholder="0.7" {...field} value={field.value ?? ""} />
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
