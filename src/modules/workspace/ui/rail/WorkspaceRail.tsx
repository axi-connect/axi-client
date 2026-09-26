"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bot,
  CheckCheck,
  Inbox as InboxIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings2,
  Timer,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { CHANNEL_STATUS_LABELS, ChannelKindIcon, type ChannelDTO } from "@/modules/channels/public"
import { channelStatusDotClass } from "@/modules/channels/ui/components/ChannelStatusBadge"
import { useChannelStore } from "@/modules/channels/infrastructure/stores/channels.store"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { INBOX_VIEW_LABELS, type InboxCounts, type InboxView } from "@/modules/inbox/domain/inbox"
import { useRailMode, type RailMode } from "./use-rail-mode"

/**
 * La columna del workspace (Inbox premium F1): las cinco vistas de la bandeja,
 * como los buzones de Mail, y los canales con su estado en vivo.
 *
 * Dos formas del mismo contenido:
 * - desplegada (240 px): icono, nombre y conteo;
 * - riel (64 px, artboard 3 del lienzo): solo iconos, el conteo de lo accionable
 *   (En cola, Contigo) en una cápsula de tinta y el punto de estado del canal.
 *
 * El modo lo decide `useRailMode`:
 * - desde `xl`, desplegada salvo que la persona la pliegue (se recuerda);
 * - por debajo, riel, que el botón asoma flotando sobre la lista sin mover el panel.
 *
 * Todas las clases dependen de `data-mode`, `data-peek` y `data-variant` en la
 * raíz, así que el modo automático lo resuelve el CSS sin esperar a JavaScript.
 * En el drawer del celular va siempre desplegada y sin botón.
 *
 * Superficie de trabajo ⇒ SÓLIDA (DESIGN §5.1). Asomada flota con la sombra de
 * overlay; el drawer que la contiene en el celular es el cristal.
 */

const RAIL_ID = "workspace-rail"

/*
 * Los nombres se ven en cuatro casos: en el drawer, asomada, y desde `xl` desplegada
 * o en automático. En el resto es riel. Las clases van LITERALES (Tailwind solo
 * genera lo que lee escrito en el código).
 */
/** Visible solo con los nombres a la vista. */
const WHEN_EXPANDED =
  "hidden group-data-[variant=drawer]/rail:inline-flex group-data-[peek=true]/rail:inline-flex xl:group-data-[mode=expanded]/rail:inline-flex xl:group-data-[mode=auto]/rail:inline-flex"
/** Visible solo en el riel. */
const WHEN_COMPACT =
  "group-data-[variant=drawer]/rail:hidden group-data-[peek=true]/rail:hidden xl:group-data-[mode=expanded]/rail:hidden xl:group-data-[mode=auto]/rail:hidden"
/** El punto de estado del canal: sobre el icono en el riel, al final de la fila con nombres. */
const DOT_PLACEMENT =
  "absolute right-2.5 bottom-2 group-data-[variant=drawer]/rail:static group-data-[peek=true]/rail:static xl:group-data-[mode=expanded]/rail:static xl:group-data-[mode=auto]/rail:static"
/** La cabecera reparte «Bandeja» y el botón cuando hay nombres; en el riel, el botón al centro. */
const HEADER_SPREAD =
  "group-data-[variant=drawer]/rail:justify-between group-data-[peek=true]/rail:justify-between xl:group-data-[mode=expanded]/rail:justify-between xl:group-data-[mode=auto]/rail:justify-between"

interface ViewDef {
  id: InboxView
  icon: LucideIcon
  /** El riel solo pone cápsula a lo accionable: lo que espera y lo tuyo. */
  badge: boolean
  count: (counts: InboxCounts) => number | null
}

export const RAIL_VIEWS: ViewDef[] = [
  { id: "queued", icon: Timer, badge: true, count: (c) => c.queued },
  { id: "mine", icon: UserRound, badge: true, count: (c) => c.mine },
  { id: "ai", icon: Bot, badge: false, count: (c) => c.ai },
  { id: "all_open", icon: InboxIcon, badge: false, count: (c) => c.all_open },
  // El histórico crece sin límite: un número aquí no es accionable.
  { id: "closed", icon: CheckCheck, badge: false, count: () => null },
]

export function WorkspaceRail({
  variant = "inline",
  onNavigate,
  className,
}: {
  /** `drawer`: dentro del panel lateral del celular, siempre desplegada. */
  variant?: "inline" | "drawer"
  /** Tras elegir una vista o un canal (el drawer se cierra). */
  onNavigate?: () => void
  className?: string
}) {
  const rail = useRailMode()
  const drawer = variant === "drawer"
  const mode: RailMode = drawer ? "expanded" : rail.mode
  const expanded = drawer || rail.expanded
  const peek = !drawer && rail.peek
  const navRef = useRef<HTMLElement>(null)
  const { closePeek } = rail

  // Asomada: se cierra al tocar fuera. Escape la cierra desde el `onKeyDown` de la columna.
  useEffect(() => {
    if (!peek) return
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current !== null && !navRef.current.contains(event.target as Node)) closePeek()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [peek, closePeek])

  const navigate = () => {
    closePeek()
    onNavigate?.()
  }

  return (
    // El hueco en el layout mide siempre lo del modo, nunca lo del asomo: asomar no mueve el panel.
    <div
      data-mode={mode}
      className={cn(
        "relative flex min-h-0 shrink-0",
        !drawer &&
          "w-16 transition-[width] duration-200 ease-out motion-reduce:transition-none xl:data-[mode=auto]:w-60 xl:data-[mode=expanded]:w-60",
        drawer && "w-full",
        className,
      )}
    >
      <nav
        ref={navRef}
        id={drawer ? undefined : RAIL_ID}
        aria-label="Vistas y canales"
        data-mode={mode}
        data-peek={peek ? "true" : undefined}
        data-variant={variant}
        onKeyDown={(event) => {
          if (peek && event.key === "Escape") closePeek()
        }}
        className={cn(
          "group/rail flex min-h-0 w-full flex-col bg-background",
          !drawer && "border-r border-border",
          peek && "absolute inset-y-0 left-0 z-30 w-60 shadow-overlay",
        )}
      >
        {!drawer && (
          <div className={cn("flex h-12 shrink-0 items-center justify-center px-3", HEADER_SPREAD)}>
            <span className={cn(WHEN_EXPANDED, "px-2 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase")}>
              Bandeja
            </span>
            <RailTip label={expanded ? "Plegar el panel" : "Desplegar el panel"} show>
              <button
                type="button"
                aria-controls={RAIL_ID}
                aria-expanded={expanded}
                aria-label={expanded ? "Plegar el panel" : "Desplegar el panel"}
                onClick={rail.toggle}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {expanded ? <PanelLeftClose className="size-4" aria-hidden /> : <PanelLeftOpen className="size-4" aria-hidden />}
              </button>
            </RailTip>
          </div>
        )}

        <div className="sidebar-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pt-1 pb-4">
          {drawer && (
            <p className="px-2 pt-2 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Bandeja</p>
          )}
          <RailViews expanded={expanded} onNavigate={navigate} />
          <div aria-hidden className={cn(WHEN_COMPACT, "mx-auto h-px w-7 bg-border")} />
          <RailChannels expanded={expanded} onNavigate={navigate} />
        </div>
      </nav>
    </div>
  )
}

/** Tooltip a la derecha solo cuando el nombre no se ve (en el riel). */
function RailTip({ label, show, children }: { label: string; show: boolean; children: React.ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function RailViews({ expanded, onNavigate }: { expanded: boolean; onNavigate?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const view = useInboxStore((s) => s.view)
  const counts = useInboxStore((s) => s.counts)
  const setView = useInboxStore((s) => s.setView)
  const fetchCounts = useInboxStore((s) => s.fetchCounts)
  const inInbox = pathname?.startsWith("/workspace/inbox") ?? false

  useEffect(() => {
    if (counts === null) void fetchCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una vez al montar; luego los mueve el socket
  }, [])

  const pick = (id: InboxView) => {
    if (inInbox) setView(id)
    // Fuera del inbox se entra por la URL: `InboxViewUrlSync` la hidrata al montar.
    else router.push(id === "all_open" ? "/workspace/inbox" : `/workspace/inbox?view=${id}`)
    onNavigate?.()
  }

  return (
    <ul className="space-y-0.5" aria-label="Vistas del inbox">
      {RAIL_VIEWS.map((item) => {
        const active = inInbox && view === item.id
        const count = counts === null ? null : item.count(counts)
        const name = INBOX_VIEW_LABELS[item.id]
        const label = count !== null ? `${name}, ${String(count)}` : name
        const Icon = item.icon
        return (
          <li key={item.id}>
            <RailTip label={count !== null ? `${name} · ${String(count)}` : name} show={!expanded}>
              <button
                type="button"
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={() => pick(item.id)}
                className={cn(
                  "relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm outline-none",
                  "transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active ? "bg-accent font-medium text-foreground" : "text-foreground/80 hover:bg-accent/60",
                )}
              >
                <Icon aria-hidden className={cn("size-4 shrink-0", item.id === "ai" && "text-accent-violet")} />
                <span className={cn(WHEN_EXPANDED, "min-w-0 flex-1 truncate")}>{name}</span>
                {count !== null && count > 0 && (
                  <span className={cn(WHEN_EXPANDED, "shrink-0 text-xs tabular-nums", active ? "text-foreground" : "text-muted-foreground")}>
                    {count > 999 ? "999+" : count}
                  </span>
                )}
                {item.badge && count !== null && count > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      WHEN_COMPACT,
                      "absolute top-0.5 right-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background tabular-nums",
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            </RailTip>
          </li>
        )
      })}
    </ul>
  )
}

function RailChannels({ expanded, onNavigate }: { expanded: boolean; onNavigate?: () => void }) {
  const router = useRouter()
  const { fetchChannels, channels, loading } = useChannelStore()

  useEffect(() => {
    void fetchChannels()
  }, [fetchChannels])

  const openDetail = (channel: ChannelDTO) => {
    window.dispatchEvent(new CustomEvent("channels:detail:open", { detail: { id: channel.id } }))
    onNavigate?.()
  }
  const connect = () => {
    router.push("/settings/channels/connect")
    onNavigate?.()
  }

  return (
    <section aria-label="Canales" className="space-y-1">
      <div className={cn(WHEN_EXPANDED, "h-8 w-full items-center gap-1 pr-0.5 pl-2")}>
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Canales{channels.length > 0 ? ` · ${String(channels.length)}` : ""}
        </h2>
        <button
          type="button"
          aria-label="Refrescar canales"
          title="Refrescar canales"
          onClick={() => void fetchChannels()}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <RefreshCw className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Administrar canales"
          title="Administrar canales"
          onClick={() => {
            router.push("/settings/channels")
            onNavigate?.()
          }}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Settings2 className="size-3.5" aria-hidden />
        </button>
      </div>

      {loading && channels.length === 0 ? (
        <div role="status" aria-label="Cargando canales" className="space-y-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex h-10 items-center gap-2.5 px-3">
              <Skeleton className="size-4 shrink-0 rounded-md" />
              <Skeleton className={cn(WHEN_EXPANDED, "h-3 flex-1")} />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-0.5">
          {channels.map((channel) => {
            const status = CHANNEL_STATUS_LABELS[channel.status]
            const attention = channel.status !== "connected"
            return (
              <li key={channel.id}>
                <RailTip label={`${channel.name} · ${status}`} show={!expanded}>
                  <button
                    type="button"
                    onClick={() => openDetail(channel)}
                    aria-label={`Abrir canal ${channel.name}, estado: ${status}`}
                    className="relative flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-sm text-foreground/80 outline-none transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <ChannelKindIcon kind={channel.kind} className="size-4 shrink-0" />
                    <span className={cn(WHEN_EXPANDED, "min-w-0 flex-1 flex-col")}>
                      <span className="truncate" title={channel.name}>
                        {channel.name}
                      </span>
                      {attention && <span className="truncate text-xs text-muted-foreground">{status}</span>}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        channelStatusDotClass(channel.status),
                        "size-2 shrink-0 rounded-full ring-2 ring-background",
                        // En el riel el punto se posa sobre el icono, como en el lienzo.
                        DOT_PLACEMENT,
                      )}
                    />
                  </button>
                </RailTip>
              </li>
            )
          })}
          <li>
            <RailTip label="Conectar canal" show={!expanded}>
              <button
                type="button"
                onClick={connect}
                aria-label="Conectar canal"
                className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                <span className={cn(WHEN_EXPANDED, "truncate")}>
                  {channels.length === 0 ? "Conecta tu primer canal" : "Conectar canal"}
                </span>
              </button>
            </RailTip>
          </li>
        </ul>
      )}
    </section>
  )
}
