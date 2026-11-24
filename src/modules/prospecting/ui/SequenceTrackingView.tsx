"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronLeft,
  Eraser,
  Filter,
  Info,
  Mail,
  MessageCircle,
  MessageCircleX,
  Search as SearchIcon,
  Send,
} from "lucide-react"

import { errorMessage } from "@/core/lib/error-messages"
import { cn } from "@/core/lib/utils"
import { useAlert } from "@/core/providers/alert-provider"
import { Button } from "@/shared/components/ui/button"
import { Callout } from "@/shared/components/ui/callout"
import { Input } from "@/shared/components/ui/input"
import { SegmentedControl } from "@/shared/components/ui/segmented"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  EMAIL_STATE,
  FILTER_LABEL,
  WHATSAPP_STATE,
  emailWhy,
  matchesFilter,
  matchesQuery,
  pips,
  rowSubtitle,
  sentence,
  sequenceLine,
  whatsappWhy,
  type SequenceTrackingDTO,
  type Tone,
  type TrackingFilter,
  type TrackingRowDTO,
} from "../domain/sequence-tracking"
import { clearUndelivered, getSequenceTracking } from "../infrastructure/services/sequence-tracking.adapter"

const ALL = "all"
const WHEN = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
})
const when = (iso: string) => WHEN.format(new Date(iso))

const TONE_TEXT: Record<Tone, string> = {
  good: "text-success",
  bad: "text-destructive",
  wait: "text-muted-foreground font-normal",
  plain: "text-foreground",
}

/**
 * «Seguimiento» de una secuencia (lote 1, mockups aprobados por Cristian el
 * 23-nov): resumen por canal, una fila por negocio y «Limpiar del chat» los
 * WhatsApp que no se entregaron. Filtrable por búsqueda (`?search=<id>`).
 */
export function SequenceTrackingView({ sequenceId }: { sequenceId: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const searchId = params.get("search") ?? ALL
  const { showAlert } = useAlert()
  const [view, setView] = useState<SequenceTrackingDTO | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [filter, setFilter] = useState<TrackingFilter>("all")
  const [query, setQuery] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState<{ messages: number; conversations: number } | null>(null)

  const searchIds = useMemo(() => (searchId === ALL ? [] : [searchId]), [searchId])

  const load = useCallback(() => {
    getSequenceTracking(sequenceId, searchIds)
      .then((next) => {
        setView(next)
        setFailed(null)
      })
      .catch((error: unknown) => setFailed(errorMessage(error, "No pudimos cargar el seguimiento")))
  }, [sequenceId, searchIds])

  useEffect(() => {
    setView(null)
    load()
  }, [load])

  const rows = useMemo(
    () => (view?.rows ?? []).filter((row) => matchesFilter(row, filter) && matchesQuery(row, query)),
    [view, filter, query],
  )
  const counts = useMemo(() => {
    const all = view?.rows ?? []
    return (Object.keys(FILTER_LABEL) as TrackingFilter[]).map((key) => ({
      value: key,
      label: FILTER_LABEL[key],
      count: all.filter((row) => matchesFilter(row, key)).length,
    }))
  }, [view])

  async function clean() {
    setClearing(true)
    try {
      const result = await clearUndelivered(sequenceId, searchIds)
      setCleared(result)
      setConfirming(false)
      load()
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error, "No se pudo limpiar el chat") })
    } finally {
      setClearing(false)
    }
  }

  function chooseSearch(next: string) {
    const url = next === ALL ? `?` : `?search=${next}`
    router.replace(url)
  }

  if (failed !== null) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <Callout tone="danger" icon={Info}>
          {failed}
        </Callout>
      </div>
    )
  }

  const summary = view?.summary
  const undelivered = summary?.whatsapp.undelivered_in_chat ?? 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 md:p-6">
      <header className="min-w-0 space-y-1">
        <Link
          href="/crm/settings/sequences"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" /> Secuencias
        </Link>
        {view === null ? (
          <Skeleton className="h-8 w-72 max-w-full" />
        ) : (
          <>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-balance">
              Seguimiento · {view.sequence.name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {view.summary.businesses.toLocaleString("es-CO")} negocios
              {view.searches.length > 0 ? ` · ${String(view.searches.length)} búsquedas` : ""}
            </p>
          </>
        )}
        {view !== null && view.searches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 text-sm text-muted-foreground">
            <Filter aria-hidden className="size-3.5" />
            <Select value={searchId} onValueChange={chooseSearch}>
              <SelectTrigger className="h-8 w-72 max-w-full" aria-label="Búsqueda">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las búsquedas</SelectItem>
                {view.searches.map((search) => (
                  <SelectItem key={search.id} value={search.id}>
                    {(search.label ?? "Búsqueda sin nombre") + ` · ${String(search.businesses)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      {summary === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-label="WhatsApp" className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background p-4 md:p-5">
            <ChannelHead icon={MessageCircle} title="WhatsApp" aside={`${String(summary.whatsapp.with_channel)} de ${String(summary.businesses)} con WhatsApp`} />
            <Tiles
              items={[
                { value: summary.whatsapp.sent, label: "Salieron" },
                { value: summary.whatsapp.delivered, label: "Entregados" },
                { value: summary.whatsapp.read, label: "Leídos" },
                { value: summary.whatsapp.replied, label: "Respondieron", tone: "good" },
              ]}
            />
            {summary.whatsapp.failures.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                <span className="text-muted-foreground">No llegaron {summary.whatsapp.failed}:</span>
                {summary.whatsapp.failures.map((failure) => (
                  <span
                    key={failure.detail}
                    title={failure.detail}
                    className="inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border px-2.5"
                  >
                    <b className="font-semibold tabular-nums">{failure.count}</b>
                    <span className="truncate">{sentence(failure.detail)}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              {cleared !== null && undelivered === 0 ? (
                <p className="flex min-w-0 items-start gap-1.5 text-[12.5px] text-muted-foreground">
                  <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                  <span>
                    Se quitaron del chat {cleared.messages} mensajes que no llegaron y {cleared.conversations} chats que
                    quedaban vacíos. Aquí siguen contados, con su motivo.
                  </span>
                </p>
              ) : undelivered === 0 ? (
                <p className="flex min-w-0 items-start gap-1.5 text-[12.5px] text-muted-foreground">
                  <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>No hay mensajes sin entregar en el chat.</span>
                </p>
              ) : (
                <>
                  <p className="flex min-w-0 flex-[1_1_260px] items-start gap-1.5 text-[12.5px] text-muted-foreground">
                    <MessageCircleX aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {undelivered === 1
                        ? "Uno que no llegó sigue en el chat como «No llegó»."
                        : `${String(undelivered)} que no llegaron siguen en el chat como «No llegó».`}
                    </span>
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setConfirming(true)} disabled={confirming}>
                    <Eraser aria-hidden /> Limpiar del chat ({undelivered})
                  </Button>
                </>
              )}
            </div>
          </section>

          <section aria-label="Correo" className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background p-4 md:p-5">
            <ChannelHead icon={Mail} title="Correo" aside={`${String(summary.email.with_channel)} de ${String(summary.businesses)} con correo`} />
            <p className="text-[13px] text-muted-foreground">
              <b className="font-semibold text-foreground">{summary.email.sent}</b> salieron ·{" "}
              <b className="font-semibold text-foreground">{summary.email.delivered}</b> entregados
            </p>
            <Tiles
              items={[
                { value: summary.email.replied, label: "Respondió", tone: "good" },
                { value: summary.email.bounced, label: "Rebotaron", tone: "bad" },
                { value: summary.email.complained, label: "Spam", tone: summary.email.complained > 0 ? "bad" : undefined },
                {
                  value: summary.email.opened,
                  label: "Abrieron",
                  hint: summary.email.clicked > 0 ? `${String(summary.email.clicked)} con clic` : undefined,
                },
              ]}
            />
            <p className="mt-auto flex items-start gap-1.5 text-[12px] text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>
                En orden de importancia: respuestas, rebotes, spam y aperturas. «Abrió» es una pista: Apple Mail, Gmail y
                algunos antivirus abren el correo solos.
              </span>
            </p>
          </section>
        </div>
      )}

      {confirming && (
        <section
          aria-label="Confirmar limpieza"
          className="grid gap-2.5 rounded-2xl border border-border bg-background p-4 shadow-lg md:p-5"
        >
          <h2 className="font-sans text-[15px] font-semibold">
            ¿Quitamos del chat {undelivered === 1 ? "el WhatsApp que no llegó" : `los ${String(undelivered)} WhatsApp que no llegaron`}?
          </h2>
          <ul className="grid list-disc gap-1 pl-5 text-[13.5px] text-muted-foreground">
            <li>Solo los que no se entregaron. Lo que llegó, se leyó o tuvo respuesta no se toca.</li>
            <li>Si el chat de ese negocio queda vacío, también se quita del inbox.</li>
            <li>Aquí siguen contados como «No llegó», con su motivo. Se les puede volver a escribir.</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void clean()} disabled={clearing}>
              <Eraser aria-hidden /> {clearing ? "Quitando…" : "Sí, quitar del chat"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={clearing}>
              Ahora no
            </Button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* En el celular los cinco filtros no caben en una línea: van en un selector */}
        <div className="w-full sm:hidden">
          <Select value={filter} onValueChange={(value) => setFilter(value as TrackingFilter)}>
            <SelectTrigger aria-label="Filtrar negocios">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {counts.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {`${item.label} · ${String(item.count)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden sm:block">
          <SegmentedControl
            value={filter}
            onValueChange={setFilter}
            items={counts}
            label="Filtrar negocios"
            size="sm"
            surface="inline"
          />
        </div>
        <div className="relative w-full sm:w-64">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar negocio"
            aria-label="Buscar negocio"
            className="pl-9"
          />
        </div>
      </div>

      {view === null ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {view.rows.length === 0 ? "Nadie inscrito en esta secuencia todavía." : "Ningún negocio con este filtro."}
        </p>
      ) : (
        <div role="table" aria-label="Negocios de la secuencia" className="overflow-hidden rounded-2xl border border-border">
          <div
            role="row"
            className="hidden grid-cols-[minmax(180px,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(130px,0.7fr)] gap-3.5 border-b border-border px-4 py-2.5 text-[11.5px] font-medium tracking-wider text-muted-foreground uppercase lg:grid"
          >
            <span>Negocio</span>
            <span>WhatsApp</span>
            <span>Correo</span>
            <span>Secuencia</span>
          </div>
          {rows.map((row) => (
            <Row key={row.contact_id} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}

/** El chat del negocio, salvo que ya se haya quitado del inbox (no llegó y se limpió). */
function chatHref(row: TrackingRowDTO): string | null {
  const cell = row.whatsapp
  if (cell === null || cell.conversation_id === null) return null
  if (cell.state === "failed" && row.undelivered_in_chat === 0) return null
  return `/workspace/inbox/${cell.conversation_id}`
}

function ChannelHead({ icon: Icon, title, aside }: { icon: typeof Send; title: string; aside: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-secondary">
        <Icon aria-hidden className="size-4" />
      </span>
      <h2 className="font-sans text-[15px] font-semibold">{title}</h2>
      <span className="ml-auto truncate text-[12.5px] text-muted-foreground">{aside}</span>
    </div>
  )
}

function Tiles({
  items,
}: {
  items: { value: number; label: string; tone?: "good" | "bad"; hint?: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 rounded-xl bg-secondary px-2.5 py-2",
            item.tone === "good" && item.value > 0 && "bg-success/10",
          )}
        >
          <b
            className={cn(
              "block text-[22px] leading-tight font-semibold tabular-nums",
              item.tone === "good" && item.value > 0 && "text-success",
              item.tone === "bad" && item.value > 0 && "text-destructive",
            )}
          >
            {item.value}
          </b>
          <span className="block truncate text-xs text-muted-foreground">{item.label}</span>
          {item.hint !== undefined && <span className="block truncate text-[11.5px] text-muted-foreground">{item.hint}</span>}
        </div>
      ))}
    </div>
  )
}

function Row({ row }: { row: TrackingRowDTO }) {
  const sequence = sequenceLine(row, when)
  const subtitle = rowSubtitle(row)
  return (
    <div
      role="row"
      className="grid grid-cols-1 gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0 lg:grid-cols-[minmax(180px,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(130px,0.7fr)] lg:items-center lg:gap-3.5"
    >
      <div className="min-w-0">
        <p className="truncate font-medium" title={row.name}>{row.name}</p>
        {subtitle !== "" && <p className="truncate text-[12.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      <Channel
        icon={MessageCircle}
        label={row.whatsapp === null ? null : WHATSAPP_STATE[row.whatsapp.state]}
        why={row.whatsapp === null ? "Sin WhatsApp" : whatsappWhy(row.whatsapp, when)}
        failed={row.whatsapp?.state === "failed"}
        href={chatHref(row)}
        tag={row.whatsapp?.state === "failed" && row.undelivered_in_chat === 0 ? "Fuera del chat" : null}
      />
      <Channel
        icon={Mail}
        label={row.email === null ? null : EMAIL_STATE[row.email.state]}
        why={row.email === null ? "Sin correo" : emailWhy(row.email, when)}
        failed={row.email?.state === "bounced" || row.email?.state === "failed"}
        href={null}
        tag={null}
      />
      <div className="min-w-0 text-[13px]">
        <p className="truncate">{sequence.main}</p>
        {sequence.sub !== "" && <p className="truncate text-[12.5px] text-muted-foreground">{sequence.sub}</p>}
      </div>
    </div>
  )
}

function Channel({
  icon: Icon,
  label,
  why,
  failed,
  href,
  tag,
}: {
  icon: typeof Send
  label: { label: string; tone: Tone; step: number } | null
  why: string
  failed: boolean
  href: string | null
  tag: string | null
}) {
  const marks = label === null ? [] : pips(label.step, failed)
  const head = (
    <span className={cn("flex min-w-0 items-center gap-2 text-[13.5px] font-medium", label === null ? "text-muted-foreground font-normal" : TONE_TEXT[label.tone])}>
      {marks.length > 0 && (
        <span aria-hidden className="inline-flex shrink-0 gap-[3px]">
          {marks.map((mark, index) => (
            <i
              key={index}
              className={cn(
                "block size-1.5 rounded-full",
                mark === "on" && "bg-accent-violet",
                mark === "x" && "bg-destructive",
                mark === "off" && "bg-border",
              )}
            />
          ))}
        </span>
      )}
      <span className="truncate">{label?.label ?? "—"}</span>
      {tag !== null && (
        <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-1.5 text-[11.5px] font-medium text-muted-foreground">
          <Eraser aria-hidden className="size-3" />
          {tag}
        </span>
      )}
    </span>
  )
  return (
    <div className="grid min-w-0 grid-cols-[16px_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5">
      <Icon aria-hidden className="size-[15px] text-muted-foreground" />
      {href === null ? head : <Link href={href} className="min-w-0 hover:underline">{head}</Link>}
      <span className="col-start-2 truncate text-[12.5px] text-muted-foreground" title={why}>
        {why}
      </span>
    </div>
  )
}
