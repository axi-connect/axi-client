import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  CrmDealCreatedEvent,
  CrmDealLostEvent,
  CrmDealStageChangedEvent,
  CrmDealStalledEvent,
  CrmDealUpdatedEvent,
  CrmDealWonEvent,
} from "@/core/realtime/events";
import {
  normalizeBoardDeal,
  type DealDTO,
  type DealStatsDTO,
  type DealStatsPeriod,
  type PipelineDTO,
  type PipelineStageDTO,
} from "@/modules/crm/domain/deal";
import {
  getDeal,
  getDealStats,
  listDeals,
  loseDeal,
  moveDeal as moveDealRequest,
  reopenDeal,
  winDeal,
} from "@/modules/crm/infrastructure/services/deals-service.adapter";
import {
  getBoard,
  listPipelines,
} from "@/modules/crm/infrastructure/services/pipelines-service.adapter";

/**
 * Store del pipeline (F3), espejo de orders.store.ts con una diferencia
 * estructural: las columnas NO son un enum fijo sino las stages del pipeline
 * activo (`columns` indexado por stage_id + `stageOrder` para el orden).
 * El kanban SOLO contiene deals `open`; won/lost viven en la tabla y stats.
 * Datos base por REST; `use-crm-socket` inyecta los eventos `crm.deal_*`.
 */
const COLUMN_PAGE_SIZE = 25;
const HIGHLIGHT_MS = 2500;
const VIEW_STORAGE_KEY = "axi:crm:view";
const PIPELINE_STORAGE_KEY = "axi:crm:pipeline";

export type CrmView = "board" | "table";
export type DealTransitionAction = "win" | "lose" | "reopen";

export type ColumnState = {
  ids: string[];
  total: number;
  total_value_cents: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
};

type TransitionResult = { ok: true } | { ok: false; message: string };

type BoardStore = {
  // Preferencias (hidratadas post-mount)
  view: CrmView;
  hydratePreferences: () => void;
  setView: (view: CrmView) => void;

  // Pipeline activo
  pipelines: PipelineDTO[];
  pipelineId: string | null;
  /** Carga pipelines y resuelve el activo (persistido → default → primero). */
  init: () => Promise<void>;
  selectPipeline: (id: string) => void;

  // Tablero normalizado
  dealsById: Record<string, DealDTO>;
  columns: Record<string, ColumnState>;
  stageOrder: string[];
  stats: DealStatsDTO | null;
  statsPeriod: DealStatsPeriod;
  boardLoaded: boolean;
  boardError: string | null;
  highlightId: string | null;
  /** Contador de eventos crm.deal_* — chip "N nuevos" en la vista tabla. */
  realtimeVersion: number;

  fetchBoard: () => Promise<void>;
  fetchColumn: (stageId: string, page: number) => Promise<void>;
  fetchStats: (period?: DealStatsPeriod) => Promise<void>;
  setStatsPeriod: (period: DealStatsPeriod) => void;
  /** GET /crm/deals/:id → upsert completo (los eventos WS traen un resumen). */
  refreshDeal: (id: string) => Promise<void>;

  /** Drag: cambio de etapa optimista + rollback ante 409. */
  moveDeal: (id: string, toStageId: string) => Promise<TransitionResult>;
  /** win/lose sacan la tarjeta del board (optimista); reopen la reincorpora. */
  transition: (
    id: string,
    action: DealTransitionAction,
    options?: { value_cents?: number; reason?: string },
  ) => Promise<TransitionResult>;

  // Reducers WS (dedupe SIEMPRE: el socket puede repetir tras re-join)
  onDealCreated: (evt: CrmDealCreatedEvent) => void;
  onDealUpdated: (evt: CrmDealUpdatedEvent) => void;
  onDealStageChanged: (evt: CrmDealStageChangedEvent) => void;
  onDealWon: (evt: CrmDealWonEvent) => void;
  onDealLost: (evt: CrmDealLostEvent) => void;
  onDealStalled: (evt: CrmDealStalledEvent) => void;
};

/**
 * Quita el id de todas las columnas (ajustando count y valor) y lo inserta al
 * frente del destino. `to: null` = fuera del board (won/lost/otro pipeline).
 */
function moveId(
  columns: Record<string, ColumnState>,
  id: string,
  to: string | null,
  valueCents: number,
): Record<string, ColumnState> {
  const next = { ...columns };
  for (const stageId of Object.keys(next)) {
    if (next[stageId].ids.includes(id)) {
      next[stageId] = {
        ...next[stageId],
        ids: next[stageId].ids.filter((existing) => existing !== id),
        total: Math.max(0, next[stageId].total - 1),
        total_value_cents: Math.max(0, next[stageId].total_value_cents - valueCents),
      };
    }
  }
  if (to !== null && next[to] !== undefined) {
    next[to] = {
      ...next[to],
      ids: [id, ...next[to].ids],
      total: next[to].total + 1,
      total_value_cents: next[to].total_value_cents + valueCents,
    };
  }
  return next;
}

let highlightTimer: ReturnType<typeof setTimeout> | undefined;

export const useBoardStore = create<BoardStore>((set, get) => ({
  view: "board",
  pipelines: [],
  pipelineId: null,
  dealsById: {},
  columns: {},
  stageOrder: [],
  stats: null,
  statsPeriod: "30d",
  boardLoaded: false,
  boardError: null,
  highlightId: null,
  realtimeVersion: 0,

  hydratePreferences: () => {
    try {
      const view = window.localStorage.getItem(VIEW_STORAGE_KEY);
      set({ view: view === "table" ? "table" : "board" });
    } catch {
      // localStorage no disponible: default board.
    }
  },

  setView: (view) => {
    set({ view });
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Sin persistencia: aplica solo a la sesión actual.
    }
  },

  init: async () => {
    const pipelines = await listPipelines();
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(PIPELINE_STORAGE_KEY);
    } catch {
      // Sin persistencia.
    }
    const active =
      pipelines.find((p) => p.id === stored) ??
      pipelines.find((p) => p.is_default) ??
      pipelines[0];
    set({ pipelines, pipelineId: active?.id ?? null });
    if (active !== undefined) {
      await Promise.all([get().fetchBoard(), get().fetchStats()]);
    }
  },

  selectPipeline: (id) => {
    if (id === get().pipelineId) return;
    set({ pipelineId: id, boardLoaded: false, dealsById: {}, columns: {}, stageOrder: [] });
    try {
      window.localStorage.setItem(PIPELINE_STORAGE_KEY, id);
    } catch {
      // Sin persistencia.
    }
    void get().fetchBoard();
    void get().fetchStats();
  },

  fetchBoard: async () => {
    const pipelineId = get().pipelineId;
    if (pipelineId === null) return;
    try {
      const board = await getBoard(pipelineId);
      const deals = board.columns.flatMap((column) => column.deals.map(normalizeBoardDeal));
      set({
        dealsById: Object.fromEntries(deals.map((deal) => [deal.id, deal])),
        stageOrder: board.columns.map((column) => column.stage.id),
        columns: Object.fromEntries(
          board.columns.map((column) => [
            column.stage.id,
            {
              ids: column.deals.map((deal) => deal.id),
              total: column.total_count,
              total_value_cents: column.total_value_cents,
              loading: false,
              hasMore: column.deals.length < column.total_count,
              error: null,
            } satisfies ColumnState,
          ]),
        ),
        boardLoaded: true,
        boardError: null,
      });
    } catch (err) {
      set({
        boardLoaded: true,
        boardError: errorMessage(err, "No se pudo cargar el tablero"),
      });
    }
  },

  fetchColumn: async (stageId, page) => {
    set((state) => ({
      columns: {
        ...state.columns,
        [stageId]: { ...state.columns[stageId], loading: true, error: null },
      },
    }));
    try {
      const res = await listDeals({
        stage_id: stageId,
        status: "open",
        page,
        page_size: COLUMN_PAGE_SIZE,
      });
      set((state) => {
        const prev = state.columns[stageId];
        const incoming = res.data.map((deal) => deal.id).filter((id) => !prev.ids.includes(id));
        const ids = page === 1 ? res.data.map((deal) => deal.id) : [...prev.ids, ...incoming];
        return {
          dealsById: {
            ...state.dealsById,
            ...Object.fromEntries(res.data.map((deal) => [deal.id, deal])),
          },
          columns: {
            ...state.columns,
            [stageId]: {
              ...prev,
              ids,
              total: res.meta.total,
              loading: false,
              hasMore: ids.length < res.meta.total,
              error: null,
            },
          },
        };
      });
    } catch (err) {
      set((state) => ({
        columns: {
          ...state.columns,
          [stageId]: {
            ...state.columns[stageId],
            loading: false,
            error: errorMessage(err, "No se pudieron cargar las oportunidades"),
          },
        },
      }));
    }
  },

  fetchStats: async (period) => {
    const effective = period ?? get().statsPeriod;
    try {
      const stats = await getDealStats(effective, get().pipelineId ?? undefined);
      set({ stats, statsPeriod: effective });
    } catch {
      // KPIs no críticos: el tablero sigue funcionando sin ellos.
    }
  },

  setStatsPeriod: (period) => {
    set({ statsPeriod: period });
    void get().fetchStats(period);
  },

  refreshDeal: async (id) => {
    try {
      const fresh = await getDeal(id);
      set((state) => {
        const previous = state.dealsById[id];
        const target =
          fresh.status === "open" && fresh.pipeline_id === state.pipelineId
            ? fresh.stage_id
            : null;
        const changedPlacement =
          previous === undefined ||
          previous.stage_id !== fresh.stage_id ||
          previous.status !== fresh.status;
        return {
          dealsById: { ...state.dealsById, [id]: fresh },
          columns: changedPlacement
            ? moveId(state.columns, id, target, fresh.value_cents ?? 0)
            : state.columns,
        };
      });
    } catch {
      // 404 tras un evento tardío: desaparecerá en el próximo fetch.
    }
  },

  moveDeal: async (id, toStageId) => {
    const before = get();
    const deal = before.dealsById[id];
    if (deal === undefined) return { ok: false, message: "La oportunidad ya no existe" };
    if (deal.stage_id === toStageId) return { ok: true };

    const snapshot = { dealsById: before.dealsById, columns: before.columns };
    const stage = stageById(before.pipelines, before.pipelineId, toStageId);

    set((state) => ({
      dealsById: {
        ...state.dealsById,
        [id]: {
          ...deal,
          stage_id: toStageId,
          stage: stage ?? deal.stage,
          stage_entered_at: new Date().toISOString(),
        },
      },
      columns: moveId(state.columns, id, toStageId, deal.value_cents ?? 0),
    }));

    try {
      const fresh = await moveDealRequest(id, toStageId);
      set((state) => ({ dealsById: { ...state.dealsById, [id]: fresh } }));
      void get().fetchStats();
      return { ok: true };
    } catch (err) {
      set(snapshot);
      return { ok: false, message: errorMessage(err, "No se pudo mover la oportunidad") };
    }
  },

  transition: async (id, action, options = {}) => {
    if (get().dealsById[id] === undefined) await get().refreshDeal(id);
    const before = get();
    const deal = before.dealsById[id];
    if (deal === undefined) return { ok: false, message: "La oportunidad ya no existe" };

    const snapshot = { dealsById: before.dealsById, columns: before.columns };
    const optimisticStatus = action === "win" ? "won" : action === "lose" ? "lost" : "open";
    const target = optimisticStatus === "open" ? deal.stage_id : null;

    set((state) => ({
      dealsById: { ...state.dealsById, [id]: { ...deal, status: optimisticStatus } },
      columns: moveId(state.columns, id, target, deal.value_cents ?? 0),
    }));

    try {
      const fresh =
        action === "win"
          ? await winDeal(id, options.value_cents)
          : action === "lose"
            ? await loseDeal(id, options.reason)
            : await reopenDeal(id);
      set((state) => ({ dealsById: { ...state.dealsById, [id]: fresh } }));
      void get().fetchStats();
      return { ok: true };
    } catch (err) {
      set(snapshot);
      return { ok: false, message: errorMessage(err, "No se pudo actualizar la oportunidad") };
    }
  },

  onDealCreated: (evt) => {
    const state = get();
    set((s) => ({ realtimeVersion: s.realtimeVersion + 1 }));
    if (state.dealsById[evt.deal_id] !== undefined) return;
    if (evt.pipeline_id !== state.pipelineId) return;

    if (highlightTimer !== undefined) clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
      set({ highlightId: null });
    }, HIGHLIGHT_MS);
    set({ highlightId: evt.deal_id });

    // El evento trae un resumen sin contact/stage embebidos: hidratar completo.
    void get().refreshDeal(evt.deal_id);
    void get().fetchStats();
  },

  onDealUpdated: (evt) => {
    set((s) => ({ realtimeVersion: s.realtimeVersion + 1 }));
    if (get().dealsById[evt.deal_id] === undefined && evt.pipeline_id !== get().pipelineId) return;
    void get().refreshDeal(evt.deal_id);
    notifyDetailRefresh(evt.deal_id);
  },

  onDealStageChanged: (evt) => {
    const state = get();
    const known = state.dealsById[evt.deal_id];
    set((s) => ({
      realtimeVersion: s.realtimeVersion + 1,
      columns:
        known !== undefined
          ? moveId(s.columns, evt.deal_id, evt.stage_id, known.value_cents ?? 0)
          : s.columns,
    }));
    void get().refreshDeal(evt.deal_id);
    notifyDetailRefresh(evt.deal_id);
  },

  onDealWon: (evt) => {
    const known = get().dealsById[evt.deal_id];
    set((s) => ({
      realtimeVersion: s.realtimeVersion + 1,
      columns:
        known !== undefined ? moveId(s.columns, evt.deal_id, null, known.value_cents ?? 0) : s.columns,
      dealsById:
        known !== undefined
          ? { ...s.dealsById, [evt.deal_id]: { ...known, status: "won" } }
          : s.dealsById,
    }));
    void get().fetchStats();
    notifyDetailRefresh(evt.deal_id);
  },

  onDealLost: (evt) => {
    const known = get().dealsById[evt.deal_id];
    set((s) => ({
      realtimeVersion: s.realtimeVersion + 1,
      columns:
        known !== undefined ? moveId(s.columns, evt.deal_id, null, known.value_cents ?? 0) : s.columns,
      dealsById:
        known !== undefined
          ? { ...s.dealsById, [evt.deal_id]: { ...known, status: "lost" } }
          : s.dealsById,
    }));
    void get().fetchStats();
    notifyDetailRefresh(evt.deal_id);
  },

  onDealStalled: (evt) => {
    // El ⚠ se deriva de stage_entered_at + rotting_days; el evento solo
    // refresca los datos por si el sweep corrigió algo.
    set((s) => ({ realtimeVersion: s.realtimeVersion + 1 }));
    void get().refreshDeal(evt.deal_id);
  },
}));

function stageById(
  pipelines: PipelineDTO[],
  pipelineId: string | null,
  stageId: string,
): PipelineStageDTO | undefined {
  return pipelines
    .find((pipeline) => pipeline.id === pipelineId)
    ?.stages.find((stage) => stage.id === stageId);
}

/** El rail abierto escucha este CustomEvent (convención §9: familia:acción:estado). */
function notifyDetailRefresh(dealId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("crm:deal:detail:refresh", { detail: { deal_id: dealId } }));
}
