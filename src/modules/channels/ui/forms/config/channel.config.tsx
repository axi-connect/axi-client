"use client"

import { z } from "zod"
import { useSession } from "@/shared/auth/auth.hooks"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import type { ChannelProvider, ChannelType } from "@/modules/channels/domain/enums"
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form"

export const channelFormSchema = z.object({
  company_id: z.coerce.number().int().positive("Requerido"),
  name: z.string().min(3, "Mínimo 3 caracteres"),
  type: z.custom<ChannelType>(),
  provider: z.custom<ChannelProvider>(),
  provider_account: z.string().min(3, "Requerido"),
  default_agent_id: z.coerce.number().int().positive().optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  expires_at: z.coerce.date().optional(),
})

export type ChannelFormValues = z.infer<typeof channelFormSchema>

export const useDefaultChannelFormValues = (): ChannelFormValues => {
    const session = useSession()
    return {
        name: "",
        type: "WHATSAPP",
        config: undefined,
        provider: "DEFAULT",
        provider_account: "",
        expires_at: undefined,
        credentials: undefined,
        default_agent_id: undefined,
        company_id: session.user?.company_id as unknown as number,
    }
}

const PROVIDER_OPTIONS: Array<{ id: ChannelProvider; label: string }> = [
  { id: "META", label: "Meta" },
  { id: "TWILIO", label: "Twilio" },
  { id: "CUSTOM", label: "Custom" },
  { id: "DEFAULT", label: "Default" },
]

const TYPE_OPTIONS: Array<{ id: ChannelType; label: string }> = [
  { id: "WHATSAPP", label: "WhatsApp" },
  { id: "EMAIL", label: "Email" },
  { id: "TELEGRAM", label: "Telegram" },
  { id: "INSTAGRAM", label: "Instagram" },
  { id: "MESSENGER", label: "Messenger" },
  { id: "CALL", label: "Llamada" },
]

export function buildChannelFormFields(): ReadonlyArray<FieldConfig<ChannelFormValues>> {

    return [
        createInputField<ChannelFormValues>("name", { label: "Nombre del canal", placeholder: "WhatsApp | Ventas"}),
        createInputField<ChannelFormValues>("provider_account", { label: "Cuenta del proveedor", placeholder: "+57300... | email@dominio.com" }),
        createCustomField<ChannelFormValues>("provider", ({ value, setValue }) => (
            <div className="flex flex-wrap gap-2">
            {PROVIDER_OPTIONS.map(opt => (
                <button
                type="button"
                key={opt.id}
                onClick={() => setValue("provider", opt.id)}
                className={`px-3 py-1.5 rounded-full border text-sm ${value === opt.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground/80 border-border"}`}
                >{opt.label}</button>
            ))}
            </div>
        ), { label: "Proveedor", colSpan: { base: 1, md: 2 } }),
        createInputField<ChannelFormValues>("default_agent_id", { label: "Agente por defecto", placeholder: "Opcional" }),
        createInputField<ChannelFormValues>("expires_at", { label: "Expira", inputKind: "datetime-local" }),
        createCustomField<ChannelFormValues>("type", ({ value, setValue }) => (
        <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(opt => (
            <button
                type="button"
                key={opt.id}
                onClick={() => setValue("type", opt.id)}
                className={`px-3 py-1.5 rounded-full border text-sm ${value === opt.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground/80 border-border"}`}
            >{opt.label}</button>
            ))}
        </div>
        ), { label: "Tipo de canal", colSpan: { base: 1, md: 2 } }),
        createCustomField<ChannelFormValues>("credentials", ({ value, setValue }) => (
        <textarea
            className="px-2 py-1.5 text-sm rounded-md border border-border bg-background w-full h-24"
            placeholder='Credenciales (JSON). Ej: {"accessToken":"...","phoneNumberId":"..."}'
            value={value ? JSON.stringify(value, null, 2) : ""}
            onChange={(e) => {
            try {
                const val = e.target.value ? (JSON.parse(e.target.value) as Record<string, unknown>) : undefined
                setValue("credentials", val)
            } catch {}
            }}
        />
        ), { label: "Credenciales" }),
        createCustomField<ChannelFormValues>("config", ({ value, setValue }) => (
        <textarea
            className="px-2 py-1.5 text-sm rounded-md border border-border bg-background w-full h-24"
            placeholder='Config (JSON). Ej: {"webhookUrl":"https://...","timeout":5000}'
            value={value ? JSON.stringify(value, null, 2) : ""}
            onChange={(e) => {
            try {
                const val = e.target.value ? (JSON.parse(e.target.value) as Record<string, unknown>) : undefined
                setValue("config", val)
            } catch {}
            }}
        />
        ), { label: "Configuración" }),
    ] as const
}