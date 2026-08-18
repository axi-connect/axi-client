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
 * Instagram y Messenger se conectan igual, con el id de la cuenta o de la página
 * y un token: sus adaptadores existen en el backend desde B9. Lo que todavía no
 * existe para ellos es el alta por Embedded Signup, así que el wizard los manda
 * por aquí (véase el registry).
 */
const NONE_AGENT = "__none__"

const channelFormSchema = z
  .object({
    name: z.string().trim().min(3, "Mínimo 3 caracteres"),
    kind: z.enum(["whatsapp_cloud", "whatsapp_web", "instagram_dm", "facebook_messenger"]),
    provider_account_id: z.string().trim().optional().or(z.literal("")),
    waba_id: z.string().trim().optional().or(z.literal("")),
    access_token: z.string().trim().optional().or(z.literal("")),
    default_ai_agent_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    // Todos los kinds con token exigen cuenta + token; solo wweb se conecta por
    // pairing. El backend valida lo mismo (`TokenChannelKind`).
    if (values.kind !== "whatsapp_web") {
      if (!values.provider_account_id) {
        ctx.addIssue({ code: "custom", path: ["provider_account_id"], message: ACCOUNT_HINT[values.kind] })
      }
      if (!values.access_token) {
        ctx.addIssue({ code: "custom", path: ["access_token"], message: "Requerido para conectar con token" })
      }
    }
  })

type ChannelFormValues = z.infer<typeof channelFormSchema>

/**
 * Kinds que se pueden CREAR desde la interfaz.
 *
 * `whatsapp_web` queda fuera a propósito: vincular por QR usa un cliente no
 * oficial de WhatsApp, que las condiciones de la plataforma de Meta no
 * permiten, y ofrecerlo junto al alta de la Cloud API es un riesgo durante el
 * App Review y después. Los canales QR existentes se siguen EDITANDO con este
 * mismo formulario (el enum de validación sí lo acepta); lo que desaparece es
 * el alta.
 */
const CREATABLE_KINDS = ["whatsapp_cloud", "instagram_dm", "facebook_messenger"] as const

/** Kinds que el formulario sabe EDITAR: incluye los QR ya existentes. */
const EDITABLE_KINDS = [
  "whatsapp_cloud",
  "whatsapp_web",
  "instagram_dm",
  "facebook_messenger",
] as const

type EditableKind = (typeof EDITABLE_KINDS)[number]

/** `simulator` no se edita aquí: lo gobierna el módulo de calidad. */
function toEditableKind(kind: string | undefined): EditableKind | undefined {
  return EDITABLE_KINDS.find((candidate) => candidate === kind)
}

/** Cómo se llama el identificador de la cuenta en cada proveedor. */
const ACCOUNT_LABEL: Record<string, string> = {
  whatsapp_cloud: "Phone Number ID",
  instagram_dm: "ID de la cuenta de Instagram",
  facebook_messenger: "ID de la página de Facebook",
}

/** Qué identificador pide cada proveedor. No es el mismo campo en todos. */
const ACCOUNT_HINT: Record<string, string> = {
  whatsapp_cloud: "Requerido para Cloud API (phone_number_id)",
  instagram_dm: "Requerido para Instagram (id de la cuenta profesional)",
  facebook_messenger: "Requerido para Messenger (id de la página)",
}

export type ChannelFormHost = {
  /** Canal existente → modo edición (name + agente por defecto). */
  channel?: ChannelDTO | null
  onSuccess?: () => void
}

/**
 * `fixedKind` lo usa el wizard: cuando el proveedor ya se eligió en el paso 1,
 * volver a preguntarlo aquí es pedir dos veces lo mismo y deja abierta la puerta
 * a que el usuario cree un canal de otro tipo del que dijo querer.
 */
export function ChannelForm({
  host,
  onSuccess,
  fixedKind,
}: {
  host?: ChannelFormHost
  onSuccess?: () => void
  fixedKind?: (typeof CREATABLE_KINDS)[number]
}) {
  const { showAlert } = useAlert()
  const isEdit = Boolean(host?.channel)
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const handleSuccess = onSuccess ?? host?.onSuccess

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: host?.channel?.name ?? "",
      kind: fixedKind ?? toEditableKind(host?.channel?.kind) ?? "whatsapp_cloud",
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
          ...(values.kind !== "whatsapp_web"
            ? {
                provider_account_id: values.provider_account_id,
                access_token: values.access_token,
                // El WABA es un concepto de WhatsApp: IG y Messenger no tienen
                ...(values.kind === "whatsapp_cloud" && values.waba_id
                  ? { waba_id: values.waba_id }
                  : {}),
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

        {!isEdit && fixedKind === undefined && (
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
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!isEdit && kind !== "whatsapp_web" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              name="provider_account_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{ACCOUNT_LABEL[kind] ?? "Identificador de la cuenta"}</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {kind === "whatsapp_cloud" && (
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
            )}
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
