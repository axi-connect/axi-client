"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bot, CheckCheck, Inbox as InboxIcon, PanelLeft, Timer, UserRound, type LucideIcon } from "lucide-react"
import { useAuth } from "@/shared/auth/auth.hooks"
import { Button } from "@/shared/components/ui/button"
import { SegmentedControl } from "@/shared/components/ui/segmented"
import {
  clearAll,
  countActive,
  FilterChips,
  FilterPanel,
  FilterTrigger,
  removeFilter,
  type FilterValues,
} from "@/shared/components/features/filter-panel"
import type { ChannelDTO } from "@/modules/channels/public"
import { getTenantUsers, type AssignableUser } from "@/modules/crm/public"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import { buildInboxQuery } from "@/modules/inbox/infrastructure/stores/inbox-query"
import { listInboxConversations } from "@/modules/inbox/infrastructure/services/inbox-service.adapter"
import { getInboxChannels } from "@/modules/inbox/infrastructure/services/inbox-filter-options"
import { INBOX_VIEW_LABELS, INBOX_VIEWS, type InboxView } from "@/modules/inbox/domain/inbox"
import { viewSubtitle } from "@/modules/inbox/domain/inbox-summary"
import { useInboxDayIfMounted } from "@/modules/inbox/infrastructure/stores/inbox-day.context"
import { useMinuteTick } from "@/modules/inbox/ui/hooks/use-minute-tick"
import { sinceLabel } from "../day/since-label"
import { hydrateInboxFilters, INBOX_FILTERS_BASE } from "./inbox.filters"
import { InboxSearch } from "./InboxSearch"
import { SortMenu } from "./SortMenu"

/** Icono por vista: en el rail estrecho es lo único visible salvo en la activa. */
const VIEW_ICONS: Record<InboxView, LucideIcon> = {
  queued: Timer,
  mine: UserRound,
  ai: Bot,
  all_open: InboxIcon,
  closed: CheckCheck,
}

function viewCount(view: InboxView, counts: ReturnType<typeof useInboxStore.getState>["counts"]): number | null {
  if (counts === null) return null
  switch (view) {
    case "queued":
      return counts.queued
    case "mine":
      return counts.mine
    case "ai":
      return counts.ai
    case "all_open":
      return counts.all_open
    case "closed":
      // El histórico crece sin límite: un número aquí no es accionable. El
      // total de la vista se ve en «Mostrando X de Y».
      return null
  }
}

const DRAFT_COUNT_DEBOUNCE_MS = 350

/**
 * Cabecera de la lista (Inbox premium F1). Filas que nunca se ensanchan:
 * 1. el título de la vista en Nexa + la frase viva («3 esperan · la más
 *    antigua hace 14 min»), y a la derecha orden, filtros y el drawer (<lg);
 * 2. la búsqueda a todo el ancho;
 * 3. por debajo de `lg`, las cinco vistas en el segmentado. Desde `lg` viven en
 *    la columna del workspace, como los buzones de Mail;
 * 4. los chips de filtros, solo cuando hay filtros activos.
 *
 * Suscribe solo a lo que pinta (vista, orden, búsqueda, filtros, counts,
 * total), nunca a `conversations`, que cambia con cada mensaje.
 */
export function InboxListHeader() {
  const view = useInboxStore((s) => s.view)
  const sort = useInboxStore((s) => s.sort)
  const q = useInboxStore((s) => s.q)
  const filters = useInboxStore((s) => s.filters)
  const counts = useInboxStore((s) => s.counts)
  const total = useInboxStore((s) => s.total)
  const loadingList = useInboxStore((s) => s.loadingList)
  const setView = useInboxStore((s) => s.setView)
  const setSort = useInboxStore((s) => s.setSort)
  const setSearch = useInboxStore((s) => s.setSearch)
  const applyFilters = useInboxStore((s) => s.applyFilters)

  const { hasPermission } = useAuth()
  const canFilterAssignee = hasPermission("conversations:manage")

  // Opciones del panel: canales del tenant y operadores (solo con permiso).
  // Ambas cacheadas a nivel de módulo; una que falle no rompe el panel, solo
  // deja su filtro sin opciones.
  const [channels, setChannels] = useState<ChannelDTO[]>([])
  const [users, setUsers] = useState<AssignableUser[]>([])
  useEffect(() => {
    let cancelled = false
    getInboxChannels()
      .then((list) => {
        if (!cancelled) setChannels(list)
      })
      .catch(() => {})
    if (canFilterAssignee) {
      getTenantUsers()
        .then((list) => {
          if (!cancelled) setUsers(list)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [canFilterAssignee])

  const schema = useMemo(
    () => hydrateInboxFilters(INBOX_FILTERS_BASE, { channels, users, canFilterAssignee }),
    [channels, users, canFilterAssignee],
  )
  const activeCount = countActive(INBOX_FILTERS_BASE, filters)

  const [filtersOpen, setFiltersOpen] = useState(false)

  // La frase viva: los conteos de la vista, o cuántas coinciden si se busca o filtra.
  const day = useInboxDayIfMounted()
  const now = useMinuteTick()
  const narrowed = q.trim() !== "" || activeCount > 0
  const subtitle = narrowed
    ? loadingList
      ? null
      : total === 1
        ? "1 coincide con la búsqueda o los filtros"
        : `${total.toLocaleString("es-CO")} coinciden con la búsqueda o los filtros`
    : viewSubtitle(view, counts, sinceLabel(day?.head?.queued_at ?? null, now))
  const waitingDot = !narrowed && view === "queued" && (counts?.queued ?? 0) > 0

  // Contador del botón «Ver N conversaciones»: `page_size: 1` sobre el mismo
  // listado con el borrador, así número y lista no pueden discrepar. Con rebote
  // y turno para que una respuesta lenta no pise a la actual.
  const [previewCount, setPreviewCount] = useState<number | null | undefined>(undefined)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftTurn = useRef(0)
  const onDraftChange = useCallback(
    (draft: FilterValues) => {
      setPreviewCount(null)
      if (draftTimer.current !== null) clearTimeout(draftTimer.current)
      draftTimer.current = setTimeout(() => {
        const turn = ++draftTurn.current
        const state = useInboxStore.getState()
        listInboxConversations({
          ...buildInboxQuery({ view: state.view, sort: state.sort, q: state.q, filters: draft, page: 1 }),
          page_size: 1,
        })
          .then((res) => {
            if (turn === draftTurn.current) setPreviewCount(res.meta.total)
          })
          .catch(() => {
            if (turn === draftTurn.current) setPreviewCount(null)
          })
      }, DRAFT_COUNT_DEBOUNCE_MS)
    },
    [],
  )
  useEffect(() => () => {
    if (draftTimer.current !== null) clearTimeout(draftTimer.current)
  }, [])

  return (
    <div className="shrink-0 space-y-3 border-b border-border bg-background px-4 pt-4 pb-3">
      <div className="flex items-start gap-1">
        {/* En <lg las vistas y los canales viven en un drawer: este botón lo abre. */}
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 size-10 shrink-0 lg:hidden"
          aria-label="Abrir vistas y canales"
          onClick={() => window.dispatchEvent(new CustomEvent("workspace:channels-drawer:open"))}
        >
          <PanelLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-2xl leading-tight font-bold tracking-tight">{INBOX_VIEW_LABELS[view]}</h1>
          <p className="mt-0.5 flex min-h-4 min-w-0 items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {waitingDot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warning" />}
            {subtitle !== null && <span className="truncate">{subtitle}</span>}
          </p>
        </div>
        <SortMenu value={sort} onChange={setSort} />
        <FilterTrigger compact count={activeCount} onClick={() => setFiltersOpen(true)} />
      </div>

      <InboxSearch value={q} onChange={setSearch} />

      {/* Eligen qué se lista, no abren panel ⇒ radiogroup (DS §9.3). Solo la
          vista activa muestra su etiqueta: cinco no caben en 264 px. */}
      <SegmentedControl
        className="w-full lg:hidden"
        value={view}
        onValueChange={setView}
        label="Vistas del inbox"
        size="sm"
        surface="inline"
        labels="active"
        items={INBOX_VIEWS.map((option) => {
          const count = viewCount(option, counts)
          return {
            value: option,
            label: INBOX_VIEW_LABELS[option],
            icon: VIEW_ICONS[option],
            count: count !== null && count > 0 ? count : null,
          }
        })}
      />

      {activeCount > 0 && (
        <FilterChips
          schema={schema}
          values={filters}
          onRemove={(key) => applyFilters(removeFilter(schema, filters, key))}
          onClearAll={() => applyFilters(clearAll(schema, filters))}
        />
      )}

      <FilterPanel
        open={filtersOpen}
        onOpenChange={(open) => {
          setFiltersOpen(open)
          if (!open) setPreviewCount(undefined)
        }}
        schema={schema}
        value={filters}
        onApply={(values) => {
          applyFilters(values)
          setFiltersOpen(false)
        }}
        onDraftChange={onDraftChange}
        resultCount={previewCount}
        countNoun={{ one: "conversación", many: "conversaciones" }}
        title="Filtros del inbox"
        subtitle="Se aplican a la vista actual"
      />
    </div>
  )
}
