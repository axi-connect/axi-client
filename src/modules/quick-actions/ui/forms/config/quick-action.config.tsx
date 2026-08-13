"use client"

import { z } from "zod"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form"
import {
  QUICK_ACTION_TYPE_DESCRIPTIONS,
  QUICK_ACTION_TYPE_LABELS,
  type CreateQuickActionDTO,
  type QuickActionAssetDTO,
  type QuickActionDTO,
  type QuickActionInteractive,
  type QuickActionType,
  type UpdateQuickActionDTO,
} from "@/modules/quick-actions/domain/quick-action"
import { InteractiveBuilder } from "@/modules/quick-actions/ui/forms/InteractiveBuilder"
import { ResourceUploader } from "@/modules/quick-actions/ui/forms/ResourceUploader"

/**
 * Config del formulario de acciones rápidas (W5): campos condicionales por
 * `type` (isVisible) + validación por tipo con superRefine. `assets` guarda
 * los DTOs completos (la UI necesita nombre/tamaño); a la API van `asset_ids`.
 */
export const quickActionFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nombre requerido").max(120),
    type: z.enum(["media_resource", "canned_response", "whatsapp_template", "interactive"]),
    description: z
      .string()
      .trim()
      .min(1, "Descripción requerida")
      .max(500, "Máximo 500 caracteres"),
    body: z.string().trim().max(4096).optional().or(z.literal("")),
    template_name: z.string().trim().max(512).optional().or(z.literal("")),
    template_language: z.string().trim().max(15).optional().or(z.literal("")),
    enabled: z.boolean(),
    ai_enabled: z.boolean(),
    assets: z.array(z.custom<QuickActionAssetDTO>()),
    interactive: z.custom<QuickActionInteractive>().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "canned_response" && !values.body) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "El texto de la respuesta es requerido" })
    }
    if (values.type === "whatsapp_template") {
      if (!values.template_name) {
        ctx.addIssue({ code: "custom", path: ["template_name"], message: "Nombre de plantilla requerido" })
      }
      if (!values.template_language) {
        ctx.addIssue({ code: "custom", path: ["template_language"], message: "Idioma requerido (ej. es)" })
      }
    }
    if (values.type === "media_resource" && values.assets.length === 0) {
      ctx.addIssue({ code: "custom", path: ["assets"], message: "Sube al menos un archivo" })
    }
    if (values.type === "interactive") {
      const issue = interactiveIssue(values.interactive)
      if (issue) ctx.addIssue({ code: "custom", path: ["interactive"], message: issue })
    }
  })

export type QuickActionFormValues = z.infer<typeof quickActionFormSchema>

export const defaultQuickActionFormValues: QuickActionFormValues = {
  name: "",
  type: "media_resource",
  description: "",
  body: "",
  template_name: "",
  template_language: "es",
  enabled: true,
  ai_enabled: true,
  assets: [],
  interactive: null,
}

/**
 * Espejo de los checks del backend (`quickActionInteractiveSchema`). Se valida
 * aquí para dar el error en el campo y no como un 422 opaco; la autoridad
 * sigue siendo el servidor.
 */
function interactiveIssue(config: QuickActionInteractive | null): string | null {
  if (!config) return "Configura el mensaje interactivo"
  if (!config.body.trim()) return "El mensaje es requerido"
  if (config.kind === "cta_url") {
    if (!config.label.trim()) return "El texto del botón es requerido"
    if (!/^https?:\/\//.test(config.url)) return "El enlace debe empezar por http:// o https://"
    return null
  }
  const titles = config.options.map((option) => option.title.trim())
  if (titles.length < 2) return "Añade al menos dos opciones"
  if (titles.some((title) => !title)) return "Todas las opciones necesitan un título"
  if (new Set(titles.map((t) => t.toLowerCase())).size !== titles.length) {
    return "Las opciones no pueden repetirse"
  }
  return null
}

export function quickActionToFormValues(dto: QuickActionDTO): QuickActionFormValues {
  return {
    name: dto.name,
    type: dto.type,
    description: dto.description,
    body: dto.body ?? "",
    template_name: dto.template_name ?? "",
    template_language: dto.template_language ?? "es",
    enabled: dto.enabled,
    ai_enabled: dto.ai_enabled,
    assets: dto.assets,
    interactive: (dto.interactive_payload as QuickActionInteractive | null) ?? null,
  }
}

export function buildQuickActionFormFields(options: {
  /** El type es inmutable al editar (cambiarlo = crear otra acción). */
  editing: boolean
}): ReadonlyArray<FieldConfig<QuickActionFormValues>> {
  return [
    createInputField<QuickActionFormValues>("name", {
      label: "Nombre",
      placeholder: "Enviar carta",
    }),
    createCustomField<QuickActionFormValues>(
      "type",
      ({ value, setValue }) => (
        <select
          value={value as QuickActionType}
          disabled={options.editing}
          onChange={(e) => setValue("type", e.target.value as QuickActionType)}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
          aria-label="Tipo de acción"
        >
          {(Object.keys(QUICK_ACTION_TYPE_LABELS) as QuickActionType[]).map((type) => (
            <option key={type} value={type}>
              {QUICK_ACTION_TYPE_LABELS[type]} — {QUICK_ACTION_TYPE_DESCRIPTIONS[type]}
            </option>
          ))}
        </select>
      ),
      { label: "Tipo" },
    ),
    createInputField<QuickActionFormValues>("description", {
      label: "Descripción",
      inputKind: "textarea",
      placeholder: "Carta/menú del restaurante en PDF. Envíala cuando el cliente pida la carta…",
      description: "La leen los agentes IA para decidir cuándo usar este recurso.",
      colSpan: { base: 1, md: 2 },
    }),
    createCustomField<QuickActionFormValues>(
      "assets",
      ({ value, setValue, getError }) => (
        <ResourceUploader
          assets={(value as QuickActionAssetDTO[]) ?? []}
          onChange={(assets) => setValue("assets", assets)}
          error={getError()}
        />
      ),
      {
        label: "Archivos",
        colSpan: { base: 1, md: 2 },
        isVisible: (values) => values.type === "media_resource",
      },
    ),
    createInputField<QuickActionFormValues>("body", {
      label: "Mensaje (opcional, va con el primer archivo)",
      inputKind: "textarea",
      placeholder: "¡Aquí tienes nuestra carta! 📄",
      colSpan: { base: 1, md: 2 },
      isVisible: (values) => values.type === "media_resource",
    }),
    createInputField<QuickActionFormValues>("body", {
      label: "Texto de la respuesta",
      inputKind: "textarea",
      placeholder: "Nuestro horario de atención es…",
      colSpan: { base: 1, md: 2 },
      isVisible: (values) => values.type === "canned_response",
    }),
    createCustomField<QuickActionFormValues>(
      "interactive",
      ({ value, setValue, getError }) => (
        <InteractiveBuilder
          value={(value as QuickActionInteractive | null) ?? null}
          onChange={(next) => setValue("interactive", next)}
          error={getError()}
        />
      ),
      {
        label: "Mensaje interactivo",
        colSpan: { base: 1, md: 2 },
        isVisible: (values) => values.type === "interactive",
      },
    ),
    createInputField<QuickActionFormValues>("template_name", {
      label: "Nombre de la plantilla",
      placeholder: "seguimiento_pedido",
      isVisible: (values) => values.type === "whatsapp_template",
    }),
    createInputField<QuickActionFormValues>("template_language", {
      label: "Idioma",
      placeholder: "es",
      isVisible: (values) => values.type === "whatsapp_template",
    }),
    createCustomField<QuickActionFormValues>(
      "enabled",
      ({ value, setValue }) => (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue("enabled", e.target.checked)}
            className="size-4 accent-[var(--axi-brand)]"
          />
          Activa
        </label>
      ),
      { label: "" },
    ),
    createCustomField<QuickActionFormValues>(
      "ai_enabled",
      ({ value, setValue }) => (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue("ai_enabled", e.target.checked)}
            className="size-4 accent-[var(--axi-brand)]"
          />
          Disponible para agentes IA
        </label>
      ),
      {
        label: "",
        isVisible: (values) =>
          values.type === "media_resource" ||
          values.type === "canned_response" ||
          values.type === "interactive",
      },
    ),
  ] as const
}

export function toCreateQuickActionDTO(values: QuickActionFormValues): CreateQuickActionDTO {
  return {
    name: values.name,
    description: values.description,
    type: values.type,
    body: values.body || undefined,
    template_name: values.template_name || undefined,
    template_language: values.template_language || undefined,
    interactive:
      values.type === "interactive" ? (values.interactive ?? undefined) : undefined,
    enabled: values.enabled,
    ai_enabled: values.ai_enabled,
    asset_ids:
      values.type === "media_resource" ? values.assets.map((asset) => asset.id) : undefined,
  }
}

export function toUpdateQuickActionDTO(values: QuickActionFormValues): UpdateQuickActionDTO {
  // El type es inmutable: se excluye del PATCH
  const dto: CreateQuickActionDTO = toCreateQuickActionDTO(values)
  return {
    name: dto.name,
    description: dto.description,
    body: dto.body,
    template_name: dto.template_name,
    template_language: dto.template_language,
    interactive: dto.interactive,
    enabled: dto.enabled,
    ai_enabled: dto.ai_enabled,
    asset_ids: dto.asset_ids,
  }
}
