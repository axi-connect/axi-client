import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  OrderCreatedEvent,
  OrderPaymentReportedEvent,
  OrderStatusChangedEvent,
  OrderUpdatedEvent,
} from "@/core/realtime/events";
import {
  mapOrderToRow,
  mapSummaryToRow,
  type OrderRow,
  type OrderStatsDTO,
  type OrderStatus,
  type TransitionOptions,
} from "@/modules/orders/domain/order";
import {
  isKanbanStatus,
  KANBAN_COLUMNS,
  type KanbanStatus,
} from "@/modules/orders/domain/order-state";
import { playOrderSound } from "@/modules/orders/infrastructure/lib/order-sound";
import {
  cancelOrder,
  confirmOrder,
  fulfillOrder,
  getOrder,
  getOrderStats,
  listOrders,
} from "@/modules/orders/infrastructure/services/orders-service.adapter";

/**
 * Store del tablero de pedidos (F11). Estado NORMALIZADO: `ordersById` + ids
 * por columna — mover una tarjeta es mover un id (framer `layout` anima la
 * reubicación). Los datos base vienen de REST; `use-orders-socket` inyecta
 * los eventos `order.*`. La vista tabla NO usa estas columnas: pagina con
 * `usePaginatedList` y muestra un chip "N nuevos" alimentado por
 * `realtimeVersion` (no re-paginar bajo los pies del usuario).
 */
const COLUMN_PAGE_SIZE = 25;
const MAX_TOASTS = 3;
const HIGHLIGHT_MS = 2500;
const VIEW_STORAGE_KEY = "axi:orders:view";
const SOUND_STORAGE_KEY = "axi:orders:sound";

export type OrdersView = "kanban" | "table";
export type StatsPeriod = "today" | "7d" | "30d";
export type TransitionAction = "confirm" | "cancel" | "fulfill";

export type OrderToastEntry = {
  id: string;
  order_id: string;
  title: string;
  subtitle: string;
  by_ai: boolean;
};

export type ColumnState = {
  ids: string[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
};

type TransitionResult = { ok: true } | { ok: false; message: string };

type OrdersStore = {
  // Preferencias (hidratadas post-mount, patrón MUTE del slice notifications)
  view: OrdersView;
  soundEnabled: boolean;
  hydratePreferences: () => void;
  setView: (view: OrdersView) => void;
  toggleSound: () => void;

  // Tablero
  ordersById: Record<string, OrderRow>;
  columns: Record<KanbanStatus, ColumnState>;
  stats: OrderStatsDTO | null;
  statsPeriod: StatsPeriod;
  boardLoaded: boolean;
  /** Tarjeta recién llegada por WS (ring coral, se limpia sola). */
  highlightId: string | null;
  /** Contador de eventos order.* — la tabla lo usa para el chip "N nuevos". */
  realtimeVersion: number;
  toasts: OrderToastEntry[];

  fetchBoard: () => Promise<void>;
  fetchColumn: (status: KanbanStatus, page?: number) => Promise<void>;
  fetchStats: (period?: StatsPeriod) => Promise<void>;
  setStatsPeriod: (period: StatsPeriod) => void;
  /** GET /orders/:id → upsert Row completa (hidrata las `partial`). */
  refreshOrder: (id: string) => Promise<void>;

  /** Transición optimista + rollback. El mensaje de error viene mapeado. */
  transition: (
    id: string,
    action: TransitionAction,
    options: TransitionOptions & { reason?: string },
  ) => Promise<TransitionResult>;

  // Reducers WS (dedupe SIEMPRE: el socket puede repetir tras re-join)
  onOrderCreated: (evt: OrderCreatedEvent) => void;
  onOrderStatusChanged: (evt: OrderStatusChangedEvent) => void;
  onOrderPaymentReported: (evt: OrderPaymentReportedEvent) => void;
  onOrderUpdated: (evt: OrderUpdatedEvent) => void;

  dismissToast: (id: string) => void;
};

const emptyColumn = (): ColumnState => ({
  ids: [],
  total: 0,
  loading: false,
  hasMore: false,
  error: null,
});

const emptyColumns = (): Record<KanbanStatus, ColumnState> =>
  Object.fromEntries(KANBAN_COLUMNS.map((status) => [status, emptyColumn()])) as Record<
    KanbanStatus,
    ColumnState
  >;

/** Quita el id de todas las columnas y lo inserta al frente de la de destino. */
function moveId(
  columns: Record<KanbanStatus, ColumnState>,
  id: string,
  to: OrderStatus | null,
): Record<KanbanStatus, ColumnState> {
  const next = { ...columns };
  for (const status of KANBAN_COLUMNS) {
    if (next[status].ids.includes(id)) {
      next[status] = {
        ...next[status],
        ids: next[status].ids.filter((existing) => existing !== id),
        total: Math.max(0, next[status].total - 1),
      };
    }
  }
  if (to !== null && isKanbanStatus(to)) {
    next[to] = { ...next[to], ids: [id, ...next[to].ids], total: next[to].total + 1 };
  }
  return next;
}

let highlightTimer: ReturnType<typeof setTimeout> | undefined;

export const useOrdersStore = create<OrdersStore>((set, get) => ({
  view: "kanban",
  soundEnabled: true,
  ordersById: {},
  columns: emptyColumns(),
  stats: null,
  statsPeriod: "7d",
  boardLoaded: false,
  highlightId: null,
  realtimeVersion: 0,
  toasts: [],

  hydratePreferences: () => {
    try {
      const view = window.localStorage.getItem(VIEW_STORAGE_KEY);
      const sound = window.localStorage.getItem(SOUND_STORAGE_KEY);
      set({
        view: view === "table" ? "table" : "kanban",
        soundEnabled: sound !== "0",
      });
    } catch {
      // localStorage no disponible: defaults (kanban + sonido).
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

  toggleSound: () => {
    set((state) => {
      const soundEnabled = !state.soundEnabled;
      try {
        window.localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "1" : "0");
      } catch {
        // Sin persistencia: aplica solo a la sesión actual.
      }
      return { soundEnabled };
    });
  },

  fetchBoard: async () => {
    await Promise.all([
      get().fetchStats(),
      ...KANBAN_COLUMNS.map((status) => get().fetchColumn(status, 1)),
    ]);
    set({ boardLoaded: true });
  },

  fetchColumn: async (status, page = 1) => {
    set((state) => ({
      columns: {
        ...state.columns,
        [status]: { ...state.columns[status], loading: true, error: null },
      },
    }));
    try {
      const res = await listOrders({
        status,
        page,
        page_size: COLUMN_PAGE_SIZE,
        sort_by: "created_at",
        sort_dir: "desc",
      });
      const rows = res.data.map(mapOrderToRow);
      set((state) => {
        const prev = state.columns[status];
        const ids =
          page === 1
            ? rows.map((row) => row.id)
            : [...prev.ids, ...rows.map((row) => row.id).filter((id) => !prev.ids.includes(id))];
        return {
          ordersById: {
            ...state.ordersById,
            ...Object.fromEntries(rows.map((row) => [row.id, row])),
          },
          columns: {
            ...state.columns,
            [status]: {
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
          [status]: {
            ...state.columns[status],
            loading: false,
            error: errorMessage(err, "No se pudieron cargar los pedidos"),
          },
        },
      }));
    }
  },

  fetchStats: async (period) => {
    const effective = period ?? get().statsPeriod;
    try {
      const stats = await getOrderStats(effective);
      set({ stats, statsPeriod: effective });
    } catch {
      // KPIs no críticos: el tablero sigue funcionando sin ellos.
    }
  },

  setStatsPeriod: (period) => {
    set({ statsPeriod: period });
    void get().fetchStats(period);
  },

  refreshOrder: async (id) => {
    try {
      const dto = await getOrder(id);
      const row = mapOrderToRow(dto);
      set((state) => {
        const previous = state.ordersById[id];
        const columns =
          previous === undefined || previous.status !== row.status
            ? moveId(state.columns, id, row.status)
            : state.columns;
        return { ordersById: { ...state.ordersById, [id]: row }, columns };
      });
    } catch {
      // 404 tras un evento tardío: la fila desaparecerá en el próximo fetch.
    }
  },

  transition: async (id, action, options) => {
    // Deep link al detalle sin tablero cargado: hidratar antes de mover
    if (get().ordersById[id] === undefined) await get().refreshOrder(id);
    const before = get();
    const row = before.ordersById[id];
    if (row === undefined) return { ok: false, message: "El pedido ya no existe" };

    const optimisticStatus: OrderStatus =
      action === "confirm" ? "confirmed" : action === "fulfill" ? "fulfilled" : "cancelled";
    const snapshot = { ordersById: before.ordersById, columns: before.columns };

    set((state) => ({
      ordersById: {
        ...state.ordersById,
        [id]: { ...row, status: optimisticStatus },
      },
      columns: moveId(state.columns, id, optimisticStatus),
    }));

    try {
      const dto =
        action === "confirm"
          ? await confirmOrder(id, { notify_customer: options.notify_customer })
          : action === "fulfill"
            ? await fulfillOrder(id, { notify_customer: options.notify_customer })
            : await cancelOrder(id, options.reason, {
                notify_customer: options.notify_customer,
              });
      const fresh = mapOrderToRow(dto);
      set((state) => ({
        ordersById: { ...state.ordersById, [id]: fresh },
        columns:
          fresh.status === optimisticStatus
            ? state.columns
            : moveId(state.columns, id, fresh.status),
      }));
      void get().fetchStats();
      return { ok: true };
    } catch (err) {
      set(snapshot);
      return { ok: false, message: errorMessage(err, "No se pudo actualizar el pedido") };
    }
  },

  onOrderCreated: (evt) => {
    const state = get();
    if (state.ordersById[evt.order_id] !== undefined) return;
    const row = mapSummaryToRow(evt);

    if (highlightTimer !== undefined) clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
      set({ highlightId: null });
    }, HIGHLIGHT_MS);

    set((s) => ({
      ordersById: { ...s.ordersById, [row.id]: row },
      columns: moveId(s.columns, row.id, row.status),
      highlightId: row.id,
      realtimeVersion: s.realtimeVersion + 1,
      toasts: [
        ...s.toasts,
        {
          id: `${evt.order_id}-created`,
          order_id: evt.order_id,
          title: `Nuevo pedido ${evt.order_number !== null ? `#${evt.order_number}` : ""}`.trim(),
          subtitle: evt.created_by_type === "ai_agent" ? "Tomado por el agente IA" : "Creado por un operador",
          by_ai: evt.created_by_type === "ai_agent",
        },
      ].slice(-MAX_TOASTS),
    }));

    if (state.soundEnabled) playOrderSound();
    void get().refreshOrder(evt.order_id);
    void get().fetchStats();
  },

  onOrderStatusChanged: (evt) => {
    const state = get();
    const known = state.ordersById[evt.order_id];
    set((s) => ({
      ordersById:
        known !== undefined
          ? { ...s.ordersById, [evt.order_id]: { ...known, status: evt.status } }
          : s.ordersById,
      columns: moveId(s.columns, evt.order_id, evt.status),
      realtimeVersion: s.realtimeVersion + 1,
    }));
    // Tarjeta no cargada (evento de otra página) o hidratación de proof/pagos
    void get().refreshOrder(evt.order_id);
    void get().fetchStats();
    notifyDetailRefresh(evt.order_id);
  },

  onOrderPaymentReported: (evt) => {
    const state = get();
    const known = state.ordersById[evt.order_id];
    set((s) => ({
      ordersById:
        known !== undefined
          ? {
              ...s.ordersById,
              [evt.order_id]: {
                ...known,
                status: evt.status,
                pending_payment: true,
                has_payment_proof: true,
              },
            }
          : s.ordersById,
      columns: moveId(s.columns, evt.order_id, evt.status),
      realtimeVersion: s.realtimeVersion + 1,
      toasts: [
        ...s.toasts,
        {
          id: `${evt.order_id}-payment-${evt.payment_id}`,
          order_id: evt.order_id,
          title: `Pago reportado ${evt.order_number !== null ? `· #${evt.order_number}` : ""}`.trim(),
          subtitle: "Comprobante pendiente de verificación",
          by_ai: evt.created_by_type === "ai_agent",
        },
      ].slice(-MAX_TOASTS),
    }));
    if (state.soundEnabled) playOrderSound();
    void get().refreshOrder(evt.order_id);
    void get().fetchStats();
    notifyDetailRefresh(evt.order_id);
  },

  onOrderUpdated: (evt) => {
    const known = get().ordersById[evt.order_id];
    if (known === undefined) return; // drafts fuera del tablero: nada que pintar
    set((s) => ({
      ordersById: {
        ...s.ordersById,
        [evt.order_id]: { ...known, total_cents: evt.total_cents, currency: evt.currency },
      },
      realtimeVersion: s.realtimeVersion + 1,
    }));
    notifyDetailRefresh(evt.order_id);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

/** El detalle abierto escucha este CustomEvent (convención §9: familia:acción:estado). */
function notifyDetailRefresh(orderId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("orders:detail:refresh", { detail: { order_id: orderId } }));
}
