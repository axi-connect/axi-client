"use client"

import { z } from "zod"
import { useForm, type FieldErrors } from "react-hook-form"
import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/core/lib/utils"
import { Input } from "@/shared/components/ui/input"
import { useAlert } from "@/core/providers/alert-provider"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { listAgents } from "@/modules/agents/infrastructure/services/agent-service.adapter"
import { createChannel, updateChannel } from "@/modules/channels/infrastructure/services/channels-service.adapter"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"
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
 * - Crear (`POST /channels`): `provider_account_id` + `access_token`
 *   (+ `waba_id` en WhatsApp Cloud). Es el camino MANUAL de soporte; el alta
 *   normal es el botón de Meta.
 * - Editar (`PATCH /channels/:id`): solo `name` y `default_ai_agent_id`
 *   (el vínculo canal ↔ agente IA).
 */
const NONE_AGENT = "__none__"

const channelFormFields = z.object({
  name: z.string().trim().min(3, "Mínimo 3 caracteres"),
  kind: z.enum(["whatsapp_cloud", "instagram_dm", "facebook_messenger"]),
  provider_account_id: z.string().trim().optional().or(z.literal("")),
  waba_id: z.string().trim().optional().or(z.literal("")),
  access_token: z.string().trim().optional().or(z.literal("")),
  default_ai_agent_id: z.string().optional(),
})

type ChannelFormValues = z.infer<typeof channelFormFields>

/**
 * El esquema DEPENDE del modo, y no es un lujo: en edición los campos de
 * credenciales **no se pintan** (`!isEdit &&` más abajo), así que llegan vacíos
 * al validador. Con la regla siempre activa, "Guardar cambios" fallaba la
 * validación de `provider_account_id` y `access_token`, `handleSubmit` nunca
 * corría y —como esos `FormMessage` tampoco estaban montados— el usuario no veía
 * absolutamente nada: ni PATCH, ni alerta, ni error. Un campo que no se muestra
 * no se puede exigir.
 */
function makeChannelFormSchema(isEdit: boolean) {
  return channelFormFields.superRefine((values, ctx) => {
    // Editar solo toca `name` y `default_ai_agent_id`: las credenciales se rotan
    // por `PUT /channels/:id/credentials`, no por aquí.
    if (isEdit) return
    // Todos los kinds exigen cuenta + token. El backend valida lo mismo.
    if (!values.provider_account_id) {
      ctx.addIssue({ code: "custom", path: ["provider_account_id"], message: ACCOUNT_HINT[values.kind] })
    }
    if (!values.access_token) {
      ctx.addIssue({ code: "custom", path: ["access_token"], message: "Requerido para conectar con token" })
    }
  })
}

/** Kinds que se pueden CREAR desde la interfaz. */
const CREATABLE_KINDS = ["whatsapp_cloud", "instagram_dm", "facebook_messenger"] as const

/** Kinds que el formulario sabe EDITAR. */
const EDITABLE_KINDS = ["whatsapp_cloud", "instagram_dm", "facebook_messenger"] as const

type EditableKind = (typeof EDITABLE_KINDS)[number]

/** `simulator` no se edita aquí: lo gobierna el módulo de calidad. */
function toEditableKind(kind: string | undefined): EditableKind | undefined {
  return EDITABLE_KINDS.find((candidate) => candidate === kind)
}

/** Etiqueta legible por campo, para decir qué falta sin jerga de esquema. */
const FIELD_LABEL: Record<string, string> = {
  name: "Nombre del canal",
  kind: "Tipo de canal",
  provider_account_id: "Identificador de la cuenta",
  waba_id: "WABA ID",
  access_token: "Access token",
  default_ai_agent_id: "Agente IA por defecto",
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
  /** Recibe el canal ya actualizado en edición; en alta, el recién creado. */
  onSuccess?: (channel: ChannelDTO) => void
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
  onSuccess?: (channel: ChannelDTO) => void
  fixedKind?: (typeof CREATABLE_KINDS)[number]
}) {
  const { showAlert } = useAlert()
  const upsertChannel = useChannelStore((s) => s.upsertChannel)
  const isEdit = Boolean(host?.channel)
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const handleSuccess = onSuccess ?? host?.onSuccess

  const schema = useMemo(() => makeChannelFormSchema(isEdit), [isEdit])
  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(schema),
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
        const updated = await updateChannel(host.channel.id, {
          name: values.name,
          default_ai_agent_id: values.default_ai_agent_id && values.default_ai_agent_id !== NONE_AGENT
            ? values.default_ai_agent_id
            : null,
        })
        // Al store: el detalle pinta su cabecera desde ahí (`live ?? fetched`),
        // así que sin esto el PATCH pasaba y el nombre seguía siendo el viejo
        // hasta recargar — indistinguible de "no hizo nada"
        upsertChannel(updated)
        // Los valores vuelven a ser los guardados: si no, el formulario queda
        // "sucio" y el siguiente guardado reenvía lo mismo
        form.reset({ ...values, name: updated.name })
        showAlert({ tone: "success", title: "Canal actualizado", open: true, autoCloseMs: 3500 })
        handleSuccess?.(updated)
      } else {
        const created = await createChannel({
          name: values.name,
          kind: values.kind,
          provider_account_id: values.provider_account_id,
          access_token: values.access_token,
          // El WABA es un concepto de WhatsApp: IG y Messenger no tienen
          ...(values.kind === "whatsapp_cloud" && values.waba_id ? { waba_id: values.waba_id } : {}),
        })
        // El agente por defecto se asigna con un PATCH posterior (contrato del backend).
        if (values.default_ai_agent_id && values.default_ai_agent_id !== NONE_AGENT) {
          await updateChannel(created.id, { default_ai_agent_id: values.default_ai_agent_id })
        }
        showAlert({ tone: "success", title: "Canal creado", open: true, autoCloseMs: 3500 })
        handleSuccess?.(created)
      }
    } catch (err) {
      if (applyServerValidation(err, form)) return
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar el canal"), open: true })
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Red de seguridad: si la validación falla en un campo que NO está pintado, su
   * `FormMessage` no existe y el botón parece inerte. Antes de este handler eso
   * fue exactamente el bug de la edición. Que nunca vuelva a callarse.
   */
  const handleInvalid = (errors: FieldErrors<ChannelFormValues>) => {
    const fields = Object.keys(errors).map((key) => FIELD_LABEL[key] ?? key)
    showAlert({
      tone: "error",
      title: "Revisa el formulario antes de guardar",
      description: fields.length > 0 ? `Falta corregir: ${fields.join(", ")}.` : undefined,
      open: true,
    })
  }

  return (
    <Form {...form}>
      <form id="channels-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} className="space-y-4">
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

        {!isEdit && (
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
