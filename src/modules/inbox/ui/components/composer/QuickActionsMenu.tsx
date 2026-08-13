"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Loader2, MessageSquareText, MousePointerClick, SendHorizonal, Settings2, Zap } from "lucide-react"
import { errorMessage } from "@/core/lib/error-messages"
import { formatBytes } from "@/core/lib/format"
import { useAlert } from "@/core/providers/alert-provider"
import { Button } from "@/shared/components/ui/button"
import { Modal } from "@/shared/components/ui/modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import type { InteractivePayload } from "@/modules/inbox/domain/inbox"
import { InteractiveMessage } from "@/modules/inbox/ui/components/interactive"
import type {
  QuickActionDTO,
  QuickActionInteractive,
  QuickActionType,
} from "@/modules/quick-actions/domain/quick-action"
import { useQuickActionsStore } from "@/modules/quick-actions/infrastructure/stores/quick-actions.store"

const GROUP_TITLES: Record<QuickActionType, string> = {
  media_resource: "Recursos",
  canned_response: "Respuestas rápidas",
  whatsapp_template: "Plantillas",
  interactive: "Interactivos",
}

const GROUP_ORDER: QuickActionType[] = [
  "media_resource",
  "canned_response",
  "interactive",
  "whatsapp_template",
]

const TYPE_ICONS: Record<QuickActionType, typeof FileText> = {
  media_resource: FileText,
  canned_response: MessageSquareText,
  whatsapp_template: SendHorizonal,
  interactive: MousePointerClick,
}

/** Preview del contenido que se enviará (modal de confirmación, W4). */
function ActionPreview({ action }: { action: QuickActionDTO }) {
  if (action.type === "canned_response") {
    return (
      <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">{action.body}</p>
    )
  }
  if (action.type === "interactive") {
    const config = action.interactive_payload as QuickActionInteractive | null
    if (!config) {
      return (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Esta acción no tiene el mensaje configurado.
        </p>
      )
    }
    // Se reutiliza el MISMO componente que pinta el hilo: la vista previa
    // enseña exactamente lo que verá el cliente, no una aproximación
    return (
      <div className="rounded-lg bg-muted px-3 py-2 text-sm">
        {config.body}
        <InteractiveMessage interactive={toPreviewPayload(config)} outbound={false} />
      </div>
    )
  }
  if (action.type === "whatsapp_template") {
    return (
      <p className="rounded-lg bg-muted px-3 py-2 text-sm">
        Plantilla <span className="font-medium">{action.template_name}</span> ({action.template_language})
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      {action.assets.map((asset) => (
        <div key={asset.id} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{asset.filename}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(asset.size_bytes)}</span>
        </div>
      ))}
      {action.body && (
        <p className="mt-1 text-sm text-muted-foreground">
          Mensaje: <span className="text-foreground">“{action.body}”</span>
        </p>
      )}
    </div>
  )
}

/**
 * Config del tenant → forma canónica para la vista previa. Los ids reales los
 * deriva el backend al enviar; aquí basta el índice, porque la previsualización
 * solo pinta títulos y detalles.
 */
function toPreviewPayload(config: QuickActionInteractive): InteractivePayload {
  if (config.kind === "cta_url") return config
  return {
    kind: "options",
    body: config.body,
    ...(config.menu_label ? { menu_label: config.menu_label } : {}),
    options: config.options.map((option, index) => ({
      id: String(index),
      title: option.title,
      ...(option.description ? { description: option.description } : {}),
    })),
  }
}

/**
 * Menú ⚡ del composer (W4): Popover + Command con búsqueda y grupos por
 * tipo; confirmación con preview antes de enviar. El disparo va por el MISMO
 * pipeline de envío (`type=quick_action`) — WS con fallback REST lo maneja
 * el caller. Los mensajes resultantes llegan por `conversation.message_sent`.
 */
export function QuickActionsMenu({
  disabled,
  contactName,
  onExecute,
}: {
  disabled: boolean
  contactName: string
  onExecute: (action: QuickActionDTO) => Promise<void>
}) {
  const router = useRouter()
  const { showAlert } = useAlert()
  const { actions, loaded, loading, fetchActive } = useQuickActionsStore()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<QuickActionDTO | null>(null)
  const [executing, setExecuting] = useState(false)

  const handleConfirm = async () => {
    if (!confirming || executing) return
    setExecuting(true)
    try {
      await onExecute(confirming)
      setConfirming(null)
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo enviar la acción"),
        open: true,
      })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next && !loaded) void fetchActive()
        }}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label="Acciones rápidas">
            <Zap className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Buscar acción…" />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando…
                </div>
              ) : (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-1 py-2 text-sm text-muted-foreground">
                    Aún no hay acciones rápidas
                    <Link href="/settings/quick-actions" className="font-medium text-brand underline">
                      Configúralas en Ajustes
                    </Link>
                  </div>
                </CommandEmpty>
              )}
              {GROUP_ORDER.map((type) => {
                const group = actions.filter((action) => action.type === type)
                if (group.length === 0) return null
                const Icon = TYPE_ICONS[type]
                return (
                  <CommandGroup key={type} heading={GROUP_TITLES[type]}>
                    {group.map((action) => (
                      <CommandItem
                        key={action.id}
                        value={`${action.name} ${action.description}`}
                        onSelect={() => {
                          setOpen(false)
                          setConfirming(action)
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{action.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{action.description}</p>
                        </div>
                        {action.type === "media_resource" && action.assets.length > 1 && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {action.assets.length} archivos
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
              <CommandGroup>
                <CommandItem
                  value="configurar acciones"
                  onSelect={() => {
                    setOpen(false)
                    router.push("/settings/quick-actions")
                  }}
                >
                  <Settings2 className="size-4 text-muted-foreground" aria-hidden />
                  Configurar acciones rápidas…
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {confirming && (
        <Modal
          open={true}
          onOpenChange={(next) => {
            if (!next && !executing) setConfirming(null)
          }}
          config={{
            title: `Enviar «${confirming.name}»`,
            description: `Se enviará a ${contactName}:`,
            className: "sm:max-w-md",
            actions: [
              { label: "Cancelar", variant: "outline", asClose: true, id: "qa-exec-cancel" },
              {
                label: executing ? "Enviando…" : "Enviar",
                variant: "default",
                asClose: false,
                id: "qa-exec-send",
                onClick: () => void handleConfirm(),
              },
            ],
          }}
        >
          <ActionPreview action={confirming} />
        </Modal>
      )}
    </>
  )
}
