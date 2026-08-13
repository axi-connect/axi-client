"use client"

import { cn } from "@/core/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  QUICK_ACTION_OPTION_ACTION_LABELS,
  type QuickActionInteractive,
  type QuickActionOption,
  type QuickActionOptionAction,
} from "@/modules/quick-actions/domain/quick-action"

/**
 * Editor del mensaje interactivo de una acción rápida (F5).
 *
 * Dos cosas que el tenant NO escribe, y a propósito:
 *
 *  - **Los ids de las opciones**: los deriva el backend del título. Renombrar
 *    "Ver catálogo" no deja ids huérfanos en las conversaciones que ya lo
 *    ofrecieron, y nadie puede fabricarse un id de sistema a mano.
 *  - **Botones o menú**: lo decide el canal según el número de opciones y si
 *    llevan descripción. Ofrecer el interruptor sería mentir: WhatsApp topa los
 *    botones en 3 y degrada solo.
 */

/** Topes del canónico del backend (INTERACTIVE_LIMITS). */
const LIMITS = { body: 1024, option_title: 24, option_description: 72, menu_label: 20 } as const
const MIN_OPTIONS = 2
const MAX_OPTIONS = 10

const ACTIONS = Object.keys(QUICK_ACTION_OPTION_ACTION_LABELS) as QuickActionOptionAction[]

export function InteractiveBuilder({
  value,
  onChange,
  error,
}: {
  value: QuickActionInteractive | null
  onChange: (next: QuickActionInteractive) => void
  error?: string
}) {
  const config: QuickActionInteractive = value ?? {
    kind: "options",
    body: "",
    options: [{ title: "", action: "reply" }],
  }

  const setKind = (kind: QuickActionInteractive["kind"]) => {
    onChange(
      kind === "cta_url"
        ? { kind: "cta_url", body: config.body, label: "", url: "" }
        : { kind: "options", body: config.body, options: [{ title: "", action: "reply" }] },
    )
  }

  const patchOptions = (options: QuickActionOption[]) => {
    if (config.kind !== "options") return
    onChange({ ...config, options })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(["options", "cta_url"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKind(kind)}
            aria-pressed={config.kind === kind}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              config.kind === kind
                ? "border-transparent bg-brand text-white"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {kind === "options" ? "Opciones para elegir" : "Botón de enlace"}
          </button>
        ))}
      </div>

      <Textarea
        value={config.body}
        maxLength={LIMITS.body}
        onChange={(e) => onChange({ ...config, body: e.target.value })}
        placeholder="¿En qué te puedo ayudar?"
        aria-label="Mensaje"
      />

      {config.kind === "cta_url" ? (
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            value={config.label}
            maxLength={LIMITS.menu_label}
            onChange={(e) => onChange({ ...config, label: e.target.value })}
            placeholder="Texto del botón"
            aria-label="Texto del botón"
          />
          <Input
            value={config.url}
            type="url"
            onChange={(e) => onChange({ ...config, url: e.target.value })}
            placeholder="https://…"
            aria-label="Enlace"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {config.options.map((option, index) => (
            <div
              key={index}
              className="grid items-start gap-2 rounded-md border border-border/60 p-2 md:grid-cols-[1fr_1fr_auto_auto]"
            >
              <Input
                value={option.title}
                maxLength={LIMITS.option_title}
                onChange={(e) =>
                  patchOptions(
                    config.options.map((current, i) =>
                      i === index ? { ...current, title: e.target.value } : current,
                    ),
                  )
                }
                placeholder={`Opción ${String(index + 1)}`}
                aria-label={`Título de la opción ${String(index + 1)}`}
              />
              <Input
                value={option.description ?? ""}
                maxLength={LIMITS.option_description}
                onChange={(e) =>
                  patchOptions(
                    config.options.map((current, i) =>
                      i === index ? { ...current, description: e.target.value } : current,
                    ),
                  )
                }
                placeholder="Detalle (opcional)"
                aria-label={`Detalle de la opción ${String(index + 1)}`}
              />
              <select
                value={option.action ?? "reply"}
                onChange={(e) =>
                  patchOptions(
                    config.options.map((current, i) =>
                      i === index
                        ? { ...current, action: e.target.value as QuickActionOptionAction }
                        : current,
                    ),
                  )
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                aria-label={`Acción de la opción ${String(index + 1)}`}
              >
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {QUICK_ACTION_OPTION_ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={config.options.length <= 1}
                onClick={() => patchOptions(config.options.filter((_, i) => i !== index))}
                aria-label={`Quitar la opción ${String(index + 1)}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={config.options.length >= MAX_OPTIONS}
              onClick={() => patchOptions([...config.options, { title: "", action: "reply" }])}
            >
              <Plus className="size-4" /> Añadir opción
            </Button>
            <span className="text-xs text-muted-foreground">
              {config.options.length}/{MAX_OPTIONS} · mínimo {MIN_OPTIONS}
            </span>
          </div>

          <Input
            value={config.menu_label ?? ""}
            maxLength={LIMITS.menu_label}
            onChange={(e) => onChange({ ...config, menu_label: e.target.value })}
            placeholder="Ver opciones"
            aria-label="Texto que abre el menú"
          />
          <p className="text-xs text-muted-foreground">
            Con más de 3 opciones (o si alguna lleva detalle) WhatsApp lo muestra como menú
            desplegable; ese es el texto que lo abre. En WhatsApp Web, donde no hay botones, las
            opciones se envían numeradas y el cliente responde con el número.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
