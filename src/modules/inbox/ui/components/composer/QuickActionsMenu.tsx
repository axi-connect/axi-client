"use client"

import { HSM_COST_NOTE, META_TEMPLATES_HREF } from "@/core/lib/hsm-copy"
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft, FileText, LayoutTemplate, Loader2, MessageSquareText, MousePointerClick, SendHorizonal, Sparkles, Zap } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { errorMessage } from "@/core/lib/error-messages"
import { formatBytes } from "@/core/lib/format"
import { useAlert } from "@/core/providers/alert-provider"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/shared/components/ui/sheet"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/shared/components/ui/command"
import type { InteractivePayload } from "@/modules/inbox/domain/inbox"
import { InteractiveMessage } from "@/modules/inbox/ui/components/interactive"
import type { QuickActionDTO, QuickActionInteractive, QuickActionType } from "@/modules/quick-actions/domain/quick-action"
import { useQuickActionsStore } from "@/modules/quick-actions/infrastructure/stores/quick-actions.store"

const GROUP_TITLES: Record<QuickActionType, string> = {
  canned_response: "Respuestas rápidas",
  media_resource: "Recursos",
  interactive: "Interactivos",
  whatsapp_template: "Plantillas de Meta",
}

const GROUP_ORDER: QuickActionType[] = ["canned_response", "media_resource", "interactive", "whatsapp_template"]

const TYPE_ICONS: Record<QuickActionType, typeof FileText> = {
  media_resource: FileText,
  canned_response: MessageSquareText,
  whatsapp_template: LayoutTemplate,
  interactive: MousePointerClick,
}

/**
 * `templates`: la ventana de 24 h está cerrada. Solo las plantillas se pueden
 * enviar; lo demás se ve apagado bajo «Fuera de la ventana», para que nadie
 * lo busque y crea que falta. `none`: el canal no admite plantillas y la
 * ventana está cerrada (el composer no abre el menú en ese caso).
 */
export type QuickActionsMode = "all" | "templates"

const SM_QUERY = "(min-width: 40rem)"
function subscribeSm(onChange: () => void) {
  const mql = window.matchMedia(SM_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}
function useIsSmUp(): boolean {
  return useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)
}

/**
 * Acciones rápidas (F3): buscar, ver EXACTAMENTE lo que sale y enviarlo desde
 * el mismo lugar. Un clic o las flechas solo eligen y cambian la vista previa;
 * enviar exige el botón «Enviar a <nombre>» (sin envío accidental desde la
 * lista). Flota en cristal sobre el hilo (popover anclado al composer); por
 * debajo de sm es una hoja inferior, y elegir abre la vista previa.
 * El disparo va por el MISMO pipeline de envío (`type=quick_action`).
 */
export function QuickActionsMenu({
  open,
  onOpenChange,
  mode,
  contactName,
  onExecute,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: QuickActionsMode
  contactName: string
  onExecute: (action: QuickActionDTO) => Promise<void>
  /** El composer: el popover se ancla a él. */
  children: ReactNode
}) {
  const smUp = useIsSmUp()
  const { loaded, fetchActive } = useQuickActionsStore()

  useEffect(() => {
    if (open && !loaded) void fetchActive()
  }, [open, loaded, fetchActive])

  const panel = open ? (
    <QuickActionsPanel mode={mode} contactName={contactName} onExecute={onExecute} onDone={() => onOpenChange(false)} compact={!smUp} />
  ) : null

  if (!smUp) {
    return (
      <>
        {children}
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="glass-overlay max-h-[80dvh] gap-0 rounded-t-[1.75rem] p-0 pt-2">
            <SheetTitle className="sr-only">Acciones rápidas</SheetTitle>
            <SheetDescription className="sr-only">Elige una acción para ver lo que se enviará a {contactName}.</SheetDescription>
            <span aria-hidden className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-foreground/15" />
            {panel}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={10}
        aria-label="Acciones rápidas"
        className="w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-0"
        onOpenAutoFocus={(event) => {
          // El foco va al buscador (cmdk), no al primer botón del contenido.
          event.preventDefault()
          ;(event.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>("[cmdk-input]")?.focus()
        }}
      >
        {panel}
      </PopoverContent>
    </Popover>
  )
}

function QuickActionsPanel({
  mode,
  contactName,
  onExecute,
  onDone,
  compact,
}: {
  mode: QuickActionsMode
  contactName: string
  onExecute: (action: QuickActionDTO) => Promise<void>
  onDone: () => void
  compact: boolean
}) {
  const { showAlert } = useAlert()
  const { actions, loading } = useQuickActionsStore()
  const [cursor, setCursor] = useState("")
  // En el celular la vista previa es un paso: se entra al tocar y se vuelve.
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)

  const sendable = (action: QuickActionDTO) => mode === "all" || action.type === "whatsapp_template"
  // En el orden en que se pintan los grupos: la primera elegida es la primera que se ve.
  const available = GROUP_ORDER.flatMap((type) => actions.filter((action) => action.type === type && sendable(action)))
  const blocked = mode === "templates" ? actions.filter((action) => !sendable(action)) : []
  const chosen = available.find((action) => action.id === cursor) ?? (compact ? undefined : available[0])
  const firstName = contactName.split(/\s+/)[0] || contactName

  const send = async () => {
    if (!chosen || sending) return
    setSending(true)
    try {
      await onExecute(chosen)
      onDone()
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo enviar la acción") })
    } finally {
      setSending(false)
    }
  }

  const list = (
    <Command
      value={chosen?.id ?? ""}
      onValueChange={setCursor}
      className={cn("flex min-h-0 flex-col bg-transparent", compact ? "flex-1" : "w-[17rem] shrink-0 border-r border-border")}
      loop
    >
      <div className="p-3 pb-1">
        <CommandInput placeholder={mode === "templates" ? "Buscar plantilla…" : "Buscar acción…"} className="h-9" />
      </div>
      <CommandList className={cn("sidebar-scroll min-h-0 flex-1 px-1.5 pb-2", compact ? "max-h-none" : "max-h-[22rem]")}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando…
          </div>
        ) : (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1 py-2 text-sm text-muted-foreground">
              {mode === "templates" ? "No hay plantillas de Meta como acción rápida" : "Aún no hay acciones rápidas"}
              <Link
                href={mode === "templates" ? META_TEMPLATES_HREF : "/settings/quick-actions"}
                className="font-medium text-foreground underline underline-offset-2"
              >
                {mode === "templates" ? "Ver tus plantillas de Meta" : "Configúralas en Ajustes"}
              </Link>
            </div>
          </CommandEmpty>
        )}
        {GROUP_ORDER.map((type) => {
          const group = available.filter((action) => action.type === type)
          if (group.length === 0) return null
          const Icon = TYPE_ICONS[type]
          return (
            <CommandGroup key={type} heading={GROUP_TITLES[type]}>
              {group.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.id}
                  keywords={[action.name, action.description]}
                  onSelect={() => {
                    setCursor(action.id)
                    if (compact) setPreviewing(true)
                  }}
                  className={cn(
                    "min-h-11 gap-2.5 rounded-xl px-2.5 py-2",
                    !compact && "data-[selected=true]:bg-foreground data-[selected=true]:text-background",
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{action.name}</span>
                    <span className="truncate text-xs opacity-70">{action.description}</span>
                  </span>
                  {action.type === "media_resource" && action.assets.length > 1 && (
                    <span className="shrink-0 text-[11px] opacity-70">{action.assets.length} archivos</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
        {blocked.length > 0 && (
          <div role="group" aria-label="Fuera de la ventana" className="pt-1">
            <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Fuera de la ventana</p>
            {blocked.map((action) => {
              const Icon = TYPE_ICONS[action.type]
              return (
                <div key={action.id} aria-disabled="true" className="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 opacity-45">
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{action.name}</span>
                    <span className="truncate text-xs">Solo dentro de las 24 h</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CommandList>
      {!compact && (
        <Link
          href="/settings/quick-actions"
          className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Zap className="size-3.5" aria-hidden />
          Configurar acciones rápidas…
        </Link>
      )}
    </Command>
  )

  const preview = (
    <section aria-label="Vista previa" className="flex min-h-[18rem] min-w-0 flex-1 flex-col gap-3 p-4">
      {compact && (
        <button
          type="button"
          onClick={() => setPreviewing(false)}
          className="-ml-1 inline-flex h-9 w-fit items-center gap-1 rounded-full pr-3 pl-1 text-sm text-muted-foreground hover:bg-muted"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Acciones
        </button>
      )}
      {chosen ? (
        <>
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {chosen.type === "whatsapp_template" ? "Vista previa · plantilla" : `Vista previa · así le llega a ${firstName}`}
          </p>
          <ActionPreview action={chosen} />
          <span className="flex-1" />
          <div className="flex items-center gap-3">
            {!compact && (
              <span className="hidden text-[11px] text-muted-foreground md:inline">
                <Kbd>↑</Kbd> <Kbd>↓</Kbd> elegir · <Kbd>Esc</Kbd> cerrar
              </span>
            )}
            <span className="flex-1" />
            <Button className={cn("h-10 rounded-full px-4", compact && "w-full")} disabled={sending} onClick={() => void send()}>
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {sending ? "Enviando…" : `Enviar a ${firstName}`}
              {!sending && <SendHorizonal className="size-4" aria-hidden />}
            </Button>
          </div>
        </>
      ) : (
        <p className="m-auto max-w-56 text-center text-sm text-muted-foreground">Elige una acción para ver lo que se enviará.</p>
      )}
    </section>
  )

  if (compact) return <div className="flex max-h-[72dvh] min-h-0 flex-col">{previewing && chosen ? preview : list}</div>
  return <div className="flex max-h-[28rem] min-h-0">{list}{preview}</div>
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] items-center rounded-[5px] border border-border bg-background px-1 font-sans text-[10.5px] text-foreground/80">
      {children}
    </kbd>
  )
}

/** Lo que se va a enviar, con el MISMO lenguaje del hilo (burbuja saliente en tinta, F2 D1). */
function ActionPreview({ action }: { action: QuickActionDTO }) {
  if (action.type === "whatsapp_template") {
    // El DTO trae nombre e idioma, no el cuerpo: el texto lo guarda Meta.
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground/80">
            <LayoutTemplate className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{action.template_name}</span>
            <span className="text-xs text-muted-foreground">Plantilla aprobada por Meta · {action.template_language}</span>
          </span>
        </div>
        <p className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2 text-xs leading-relaxed text-foreground/80">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-violet" aria-hidden />
          El texto de la plantilla lo guarda Meta; aquí se ve su nombre y su idioma. {HSM_COST_NOTE}{" "}
          Cuando el cliente responda, la ventana se abre y puedes escribir libremente.
        </p>
      </div>
    )
  }
  if (action.type === "canned_response") {
    return <OutboundPreview>{action.body}</OutboundPreview>
  }
  if (action.type === "interactive") {
    const config = action.interactive_payload as QuickActionInteractive | null
    if (!config) {
      return <p className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">Esta acción no tiene el mensaje configurado.</p>
    }
    // El MISMO componente que pinta el hilo: la vista previa es lo que verá el cliente.
    return (
      <OutboundPreview>
        {config.body}
        <InteractiveMessage interactive={toPreviewPayload(config)} outbound />
      </OutboundPreview>
    )
  }
  return (
    <div className="flex flex-col items-end gap-1.5">
      {action.assets.map((asset) => (
        <div key={asset.id} className="flex w-full max-w-[92%] items-center gap-2 rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-sm text-background">
          <FileText className="size-4 shrink-0 opacity-80" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{asset.filename}</span>
          <span className="shrink-0 text-xs opacity-70">{formatBytes(asset.size_bytes)}</span>
        </div>
      ))}
      {action.body && <OutboundPreview>{action.body}</OutboundPreview>}
    </div>
  )
}

function OutboundPreview({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[92%] rounded-[18px] rounded-br-md bg-foreground px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-background [overflow-wrap:anywhere]">
        {children}
      </div>
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
