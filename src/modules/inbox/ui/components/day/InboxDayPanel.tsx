"use client"

import { Sparkles } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { minutesIntoDay } from "@/core/lib/business-time"
import { formatInteger } from "@/core/lib/commercial-units"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { BentoFigure, BentoTile, InkIsland, Kicker } from "@/shared/components/features/bento"
import { useMyCompany } from "@/modules/companies/public"
import type { InboxCounts, InboxStats } from "@/modules/inbox/domain/inbox"
import { daySlots, openSplit, queueNextUp, resolvedSplit } from "@/modules/inbox/domain/inbox-summary"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { useInboxDay } from "@/modules/inbox/infrastructure/stores/inbox-day.context"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { useMinuteTick } from "@/modules/inbox/ui/hooks/use-minute-tick"
import { sinceLabel } from "./since-label"
import { useClaimNext } from "./use-claim-next"

/**
 * «Tu día en el inbox» (F1): ocupa el panel de la conversación cuando no hay
 * ninguna abierta, en md+. Antes era el hueco más grande de la pantalla con un
 * «Selecciona una conversación».
 *
 * - La isla «Lo próximo» (cristal, brillo de marca): cuántos esperan, quién lleva
 *   más y «Atender a …». Sale de `counts` y de la cabeza de la cola.
 * - El bento de `GET /inbox/stats?period=today`: entraron, resueltas (Axi o
 *   equipo) y abiertas ahora. «Abiertas» sale de `counts`, que el socket mueve
 *   al instante.
 *
 * Si las cifras fallan, la isla se queda: viene de otra lectura. Cortes y
 * etiquetas en la zona del negocio, la misma con la que corta el servidor.
 */
export function InboxDayPanel({ commands, className }: { commands?: InboxCommands; className?: string }) {
  const counts = useInboxStore((s) => s.counts)
  const view = useInboxStore((s) => s.view)
  const setView = useInboxStore((s) => s.setView)
  const { stats, statsStatus, head, reloadStats } = useInboxDay()
  const timeZone = useMyCompany().company?.timezone || undefined
  const now = useMinuteTick()
  const claim = useClaimNext(commands)

  const next = queueNextUp(
    counts?.queued ?? 0,
    head === null
      ? null
      : {
          name: head.contact.full_name || head.contact.phone || "Sin nombre",
          channel: head.channel.name,
          since: sinceLabel(head.queued_at ?? head.last_inbound_at, now),
        },
    counts?.ai ?? 0,
  )
  const today = new Date(now).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone })

  return (
    <section
      aria-label="Tu día en el inbox"
      className={cn("sidebar-scroll @container min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
    >
      <div className="mx-auto w-full max-w-[40rem] space-y-4 px-6 py-8">
        <header>
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Hoy · {today}</p>
          <h2 className="mt-1.5 font-heading text-3xl leading-tight font-bold tracking-tight">Tu día en el inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lo que entró, lo que se resolvió y quién espera. Se actualiza solo.</p>
        </header>

        {/* Sin la primera lectura de counts, silueta: «Nadie espera» solo con datos (IB1-H2). */}
        {counts === null ? (
          <div role="status" aria-label="Cargando lo próximo">
            <Skeleton className="h-32 w-full rounded-3xl" />
          </div>
        ) : (
          <InkIsland label="Lo próximo" className="gap-4 p-5 @min-[34rem]:flex-row @min-[34rem]:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Kicker>Lo próximo</Kicker>
              <p className="font-heading text-4xl leading-none font-bold tracking-tight">{next.headline}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{next.line}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 @min-[34rem]:flex-col">
              {head !== null && next.firstName !== null && (
                <Button variant="contrast" disabled={claim.busy} onClick={() => void claim.run(head)}>
                  {claim.canClaim ? `Atender a ${next.firstName}` : `Abrir a ${next.firstName}`}
                </Button>
              )}
              {next.queued > 0 ? (
                <Button variant="glass" onClick={() => setView("queued")}>
                  {view === "queued" ? "Ver quién sigue" : "Ver la cola"}
                </Button>
              ) : (counts?.ai ?? 0) > 0 ? (
                <Button variant="glass" onClick={() => setView("ai")}>
                  Ver lo que atiende Axi
                </Button>
              ) : null}
            </div>
          </InkIsland>
        )}

        {statsStatus === "loading" && stats === null ? (
          <DaySkeleton />
        ) : statsStatus === "forbidden" ? null : stats === null ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            Las cifras del día no están disponibles ahora. La cola sí está al día.
            <Button size="sm" variant="outline" className="rounded-full" onClick={reloadStats}>
              Reintentar
            </Button>
          </p>
        ) : (
          <DayBento stats={stats} counts={counts} timeZone={timeZone} now={now} busy={statsStatus === "loading"} />
        )}
      </div>
    </section>
  )
}

function DayBento({
  stats,
  counts,
  timeZone,
  now,
  busy,
}: {
  stats: InboxStats
  counts: InboxCounts | null
  timeZone: string | undefined
  now: number
  busy: boolean
}) {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const nowHour = Math.floor(minutesIntoDay(new Date(now).toISOString(), tz) / 60)
  const slots = daySlots(
    stats.series.map((point) => ({ hour: Math.floor(minutesIntoDay(point.bucket, tz) / 60), value: point.new })),
    nowHour,
  )
  const resolved = resolvedSplit(stats.resolved_count, stats.ai_resolved_pct)
  const open = counts === null ? null : openSplit(counts)
  const openTotal = counts?.all_open ?? stats.open_now

  return (
    <div className="grid gap-4 @min-[34rem]:grid-cols-2">
      <BentoTile label="Entraron hoy" busy={busy} className="@min-[34rem]:col-span-2">
        <div className="flex flex-col gap-4 @min-[30rem]:flex-row @min-[30rem]:items-end">
          <div className="flex shrink-0 flex-col gap-1">
            <BentoFigure value={formatInteger(stats.new_count)} unit={stats.new_count === 1 ? "nueva" : "nuevas"} />
            <p className="text-xs text-muted-foreground">
              {stats.new_count === 0 ? "Cuando entre la primera, la verás aquí." : "Por hora, en la hora del negocio."}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <div aria-hidden className="flex h-16 items-end gap-[3px]">
              {slots.map((slot) => (
                <span
                  key={slot.hour}
                  className={cn(
                    "flex-1 rounded-[3px] bg-foreground",
                    slot.state === "now" ? "opacity-100" : slot.state === "past" ? "opacity-30" : "opacity-10",
                  )}
                  style={{ height: `${String(Math.max(6, Math.round(slot.ratio * 100)))}%` }}
                />
              ))}
            </div>
            <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>12 a. m.</span>
              <span>6 a. m.</span>
              <span>12 p. m.</span>
              <span>6 p. m.</span>
              <span>11 p. m.</span>
            </div>
          </div>
        </div>
      </BentoTile>

      <BentoTile label="Resueltas hoy" busy={busy}>
        <BentoFigure value={formatInteger(stats.resolved_count)} unit={stats.resolved_count === 1 ? "resuelta" : "resueltas"} />
        {stats.resolved_count > 0 ? (
          <>
            <div
              role="img"
              aria-label={`Axi resolvió el ${String(resolved.aiPct)} % y el equipo el ${String(resolved.teamPct)} %`}
              className="flex h-2 overflow-hidden rounded-full bg-muted"
            >
              <span className="bg-foreground" style={{ width: `${String(resolved.aiPct)}%` }} />
              <span className="bg-foreground/30" style={{ width: `${String(resolved.teamPct)}%` }} />
            </div>
            <div className="flex justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles aria-hidden className="size-3 text-accent-violet" />
                Axi · {resolved.aiPct} %
              </span>
              <span className="whitespace-nowrap text-muted-foreground">Equipo · {resolved.teamPct} %</span>
            </div>
            {resolved.ai > 0 && (
              <p className="text-xs text-muted-foreground">
                Axi cerró {formatInteger(resolved.ai)} sin pedir ayuda.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Aún no se resuelve ninguna hoy.</p>
        )}
      </BentoTile>

      <BentoTile label="Abiertas ahora" busy={busy}>
        <BentoFigure value={formatInteger(openTotal)} unit={openTotal === 1 ? "abierta" : "abiertas"} />
        {open !== null && (
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-3 shrink-0 text-accent-violet" />
              <span className="min-w-0 flex-1 truncate">Con Axi</span>
              <span className="font-medium tabular-nums">{formatInteger(open.ai)}</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="mx-[3px] size-1.5 shrink-0 rounded-full bg-foreground/60" />
              <span className="min-w-0 flex-1 truncate">Con el equipo</span>
              <span className="font-medium tabular-nums">{formatInteger(open.team)}</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="mx-[3px] size-1.5 shrink-0 rounded-full bg-warning" />
              <span className="min-w-0 flex-1 truncate">En cola</span>
              <span className="font-medium tabular-nums">{formatInteger(open.queued)}</span>
            </li>
          </ul>
        )}
      </BentoTile>

      <p className="text-xs text-muted-foreground @min-[34rem]:col-span-2">
        Cifras de hoy en la hora del negocio{timeZone !== undefined ? ` (${timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone})` : ""}. Una
        conversación resuelta deja de contar como abierta.
      </p>
    </div>
  )
}

function DaySkeleton() {
  return (
    <div role="status" aria-label="Cargando tu día" className="grid gap-4 @min-[34rem]:grid-cols-2">
      <Skeleton className="h-40 rounded-3xl @min-[34rem]:col-span-2" />
      <Skeleton className="h-44 rounded-3xl" />
      <Skeleton className="h-44 rounded-3xl" />
    </div>
  )
}
