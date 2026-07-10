"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/core/lib/utils"
import { Input } from "@/shared/components/ui/input"
import { useAlert } from "@/core/providers/alert-provider"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { listAgents } from "@/modules/agents/infrastructure/services/agent-service.adapter"
import { createChannel, updateChannel } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import { CHANNEL_KIND_LABELS, type ChannelDTO } from "@/modules/channels/domain/channel"
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
 * Formulario de canal:
 * - Crear (`POST /channels`): `whatsapp_web` solo requiere nombre;
 *   `whatsapp_cloud` además `provider_account_id` + `access_token` (+ `waba_id`).
 * - Editar (`PATCH /channels/:id`): solo `name` y `default_ai_agent_id`
 *   (el vínculo canal ↔ agente IA).
 * Instagram/Messenger llegan en F8 del backend: deshabilitados.
 */
const NONE_AGENT = "__none__"

const channelFormSchema = z
  .object({
    name: z.string().trim().min(3, "Mínimo 3 caracteres"),
    kind: z.enum(["whatsapp_cloud", "whatsapp_web"]),
    provider_account_id: z.string().trim().optional().or(z.literal("")),
    waba_id: z.string().trim().optional().or(z.literal("")),
    access_token: z.string().trim().optional().or(z.literal("")),
    default_ai_agent_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "whatsapp_cloud") {
      if (!values.provider_account_id) {
        ctx.addIssue({ code: "custom", path: ["provider_account_id"], message: "Requerido para Cloud API (phone_number_id)" })
      }
      if (!values.access_token) {
        ctx.addIssue({ code: "custom", path: ["access_token"], message: "Requerido para Cloud API" })
      }
    }
  })

type ChannelFormValues = z.infer<typeof channelFormSchema>

const CREATABLE_KINDS = ["whatsapp_web", "whatsapp_cloud"] as const

export type ChannelFormHost = {
  /** Canal existente → modo edición (name + agente por defecto). */
  channel?: ChannelDTO | null
  onSuccess?: () => void
}

export function ChannelForm({ host, onSuccess }: { host?: ChannelFormHost; onSuccess?: () => void }) {
  const { showAlert } = useAlert()
  const isEdit = Boolean(host?.channel)
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const handleSuccess = onSuccess ?? host?.onSuccess

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: host?.channel?.name ?? "",
      kind: host?.channel?.kind === "whatsapp_cloud" ? "whatsapp_cloud" : "whatsapp_web",
      provider_account_id: "",
      waba_id: "",
      access_token: "",
      default_ai_agent_id: host?.channel?.default_ai_agent_id ?? undefined,
    },
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listAgents()
        if (!cancelled) setAgents(res.data.map((a) => ({ id: a.id, name: a.name })))
      } catch {
        // El selector queda vacío; el canal puede crearse sin agente.
      }
    })()
    return () => { cancelled = true }
  }, [])

  const kind = form.watch("kind")

  const handleSubmit = async (values: ChannelFormValues) => {
    if (submitting) return
    setSubmitting(true)
    try {
      if (isEdit && host?.channel) {
        await updateChannel(host.channel.id, {
          name: values.name,
          default_ai_agent_id: values.default_ai_agent_id && values.default_ai_agent_id !== NONE_AGENT
            ? values.default_ai_agent_id
            : null,
        })
        showAlert({ tone: "success", title: "Canal actualizado", open: true, autoCloseMs: 3500 })
      } else {
        const created = await createChannel({
          name: values.name,
          kind: values.kind,
          ...(values.kind === "whatsapp_cloud"
            ? {
                provider_account_id: values.provider_account_id,
                access_token: values.access_token,
                ...(values.waba_id ? { waba_id: values.waba_id } : {}),
              }
            : {}),
        })
        // El agente por defecto se asigna con un PATCH posterior (contrato del backend).
        if (values.default_ai_agent_id && values.default_ai_agent_id !== NONE_AGENT) {
          await updateChannel(created.id, { default_ai_agent_id: values.default_ai_agent_id })
        }
        showAlert({ tone: "success", title: "Canal creado", open: true, autoCloseMs: 3500 })
      }
      handleSuccess?.()
    } catch (err) {
      if (applyServerValidation(err, form)) return
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar el canal"), open: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form id="channels-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del canal</FormLabel>
              <FormControl>
                <Input placeholder="WhatsApp | Ventas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEdit && (
          <FormField
            name="kind"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de canal</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CREATABLE_KINDS.map((kindOption) => (
                    <button
                      type="button"
                      key={kindOption}
                      onClick={() => field.onChange(kindOption)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-sm transition-colors",
                        field.value === kindOption
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-foreground/80 border-border hover:bg-accent",
                      )}
                      aria-pressed={field.value === kindOption}
                    >
                      {CHANNEL_KIND_LABELS[kindOption]}
                    </button>
                  ))}
                  <span className="px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground opacity-60" title="Disponible próximamente">
                    Instagram / Messenger (próximamente)
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!isEdit && kind === "whatsapp_cloud" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              name="provider_account_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="waba_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WABA ID (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="access_token"
              control={form.control}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Access token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="EAAG…" autoComplete="off" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          name="default_ai_agent_id"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agente IA por defecto</FormLabel>
              <Select value={field.value ?? NONE_AGENT} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin agente (solo humanos)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_AGENT}>Sin agente (solo humanos)</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

export default ChannelForm
