import { useOrdersStore } from "../orders.store";
import type { OrderCreatedEvent, OrderStatusChangedEvent } from "@/core/realtime/events";
import type { OrderRow } from "@/modules/orders/domain/order";

// Reducers puros sin red: se stubbean adapters y sonido.
jest.mock("@/modules/orders/infrastructure/services/orders-service.adapter", () => ({
  listOrders: jest.fn(async () => ({ data: [], meta: { total: 0, page: 1, page_size: 25 } })),
  getOrder: jest.fn(async () => {
    throw new Error("not found");
  }),
  getOrderStats: jest.fn(async () => {
    throw new Error("offline");
  }),
  confirmOrder: jest.fn(),
  cancelOrder: jest.fn(),
  fulfillOrder: jest.fn(),
}));
jest.mock("@/modules/orders/infrastructure/lib/order-sound", () => ({
  playOrderSound: jest.fn(),
}));

import {
  confirmOrder,
  getOrder,
} from "@/modules/orders/infrastructure/services/orders-service.adapter";

function makeRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: "ord-1",
    order_number: 42,
    status: "pending",
    contact_id: "contact-1",
    contact_name: "Ana Gómez",
    conversation_id: "conv-1",
    total_cents: 32000000,
    currency: "COP",
    created_by_type: "ai_agent",
    has_payment_proof: false,
    pending_payment: false,
    items_count: 2,
    created_at: "2026-07-11T00:00:00Z",
    ...overrides,
  };
}

function createdEvent(overrides: Partial<OrderCreatedEvent> = {}): OrderCreatedEvent {
  return {
    company_id: "company-1",
    order_id: "ord-9",
    order_number: 99,
    conversation_id: "conv-9",
    contact_id: "contact-9",
    status: "pending",
    total_cents: 5000000,
    currency: "COP",
    created_by_type: "ai_agent",
    ...overrides,
  };
}

const emptyColumn = () => ({ ids: [], total: 0, loading: false, hasMore: false, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  useOrdersStore.setState({
    ordersById: {},
    columns: {
      pending: emptyColumn(),
      confirmed: emptyColumn(),
      payment_reported: emptyColumn(),
      paid: emptyColumn(),
      fulfilled: emptyColumn(),
    },
    stats: null,
    boardLoaded: false,
    highlightId: null,
    realtimeVersion: 0,
    toasts: [],
    soundEnabled: false,
    view: "kanban",
  });
});

describe("orders.store — reducers WS", () => {
  it("order.created inserta Row parcial al tope de su columna con highlight y toast", () => {
    useOrdersStore.getState().onOrderCreated(createdEvent());
    const state = useOrdersStore.getState();
    expect(state.columns.pending.ids).toEqual(["ord-9"]);
    expect(state.ordersById["ord-9"].partial).toBe(true);
    expect(state.highlightId).toBe("ord-9");
    expect(state.toasts).toHaveLength(1);
    expect(state.realtimeVersion).toBe(1);
  });

  it("order.created con id conocido es no-op (dedupe tras re-join)", () => {
    const row = makeRow({ id: "ord-9" });
    useOrdersStore.setState({
      ordersById: { "ord-9": row },
      columns: { ...useOrdersStore.getState().columns, pending: { ...emptyColumn(), ids: ["ord-9"], total: 1 } },
    });
    useOrdersStore.getState().onOrderCreated(createdEvent());
    const state = useOrdersStore.getState();
    expect(state.columns.pending.ids).toEqual(["ord-9"]);
    expect(state.toasts).toHaveLength(0);
    expect(state.ordersById["ord-9"].partial).toBeUndefined();
  });

  it("order.status_changed mueve la tarjeta entre columnas", () => {
    const row = makeRow();
    useOrdersStore.setState({
      ordersById: { "ord-1": row },
      columns: { ...useOrdersStore.getState().columns, pending: { ...emptyColumn(), ids: ["ord-1"], total: 1 } },
    });
    const evt: OrderStatusChangedEvent = {
      ...createdEvent({ order_id: "ord-1", status: "confirmed" }),
      previous_status: "pending",
    };
    useOrdersStore.getState().onOrderStatusChanged(evt);
    const state = useOrdersStore.getState();
    expect(state.columns.pending.ids).toEqual([]);
    expect(state.columns.confirmed.ids).toEqual(["ord-1"]);
    expect(state.ordersById["ord-1"].status).toBe("confirmed");
  });

  it("order.status_changed a cancelled saca la tarjeta del tablero", () => {
    const row = makeRow();
    useOrdersStore.setState({
      ordersById: { "ord-1": row },
      columns: { ...useOrdersStore.getState().columns, pending: { ...emptyColumn(), ids: ["ord-1"], total: 1 } },
    });
    useOrdersStore.getState().onOrderStatusChanged({
      ...createdEvent({ order_id: "ord-1", status: "cancelled" }),
      previous_status: "pending",
    });
    const state = useOrdersStore.getState();
    expect(state.columns.pending.ids).toEqual([]);
    expect(state.columns.confirmed.ids).toEqual([]);
    expect(state.ordersById["ord-1"].status).toBe("cancelled");
  });

  it("order.payment_reported marca proof/pending y mueve de columna", () => {
    const row = makeRow({ status: "confirmed" });
    useOrdersStore.setState({
      ordersById: { "ord-1": row },
      columns: { ...useOrdersStore.getState().columns, confirmed: { ...emptyColumn(), ids: ["ord-1"], total: 1 } },
    });
    useOrdersStore.getState().onOrderPaymentReported({
      ...createdEvent({ order_id: "ord-1", status: "payment_reported" }),
      payment_id: "pay-1",
    });
    const state = useOrdersStore.getState();
    expect(state.columns.confirmed.ids).toEqual([]);
    expect(state.columns.payment_reported.ids).toEqual(["ord-1"]);
    expect(state.ordersById["ord-1"].pending_payment).toBe(true);
    expect(state.ordersById["ord-1"].has_payment_proof).toBe(true);
  });

  it("order.updated refresca totales sin mover columna", () => {
    const row = makeRow();
    useOrdersStore.setState({
      ordersById: { "ord-1": row },
      columns: { ...useOrdersStore.getState().columns, pending: { ...emptyColumn(), ids: ["ord-1"], total: 1 } },
    });
    useOrdersStore.getState().onOrderUpdated(
      createdEvent({ order_id: "ord-1", total_cents: 9990000 }),
    );
    const state = useOrdersStore.getState();
    expect(state.ordersById["ord-1"].total_cents).toBe(9990000);
    expect(state.columns.pending.ids).toEqual(["ord-1"]);
  });
});

describe("orders.store — transición optimista", () => {
  it("aplica el movimiento optimista y reconcilia con la respuesta del servidor", async () => {
    const row = makeRow();
    useOrdersStore.setState({
      ordersById: { "ord-1": row },
      columns: { ...useOrdersStore.getState().columns, pending: { ...emptyColumn(), ids: ["ord-1"], total: 1 } },
    });
    (confirmOrder as jest.Mock).mockResolvedValue({
      id: "ord-1",
      order_number: 42,
      status: "confirmed",
      contact_id: "contact-1",
      contact: { id: "contact-1", full_name: "Ana Gómez" },
      conversation_id: "conv-1",
      subtotal_cents: 32000000,
      discount_cents: 0,
      total_cents: 32000000,
      currency: "COP",
      intake_data: null,
      notes: null,
      created_by_type: "ai_agent",
      created_by_user_id: null,
      confirmed_at: "2026-07-11T01:00:00Z",
      paid_at: null,
      fulfilled_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      created_at: "2026-07-11T00:00:00Z",
      updated_at: "2026-07-11T01:00:00Z",
      items: [],
      payments: [],
    });

    const result = await useOrdersStore
      .getState()
      .transition("ord-1", "confirm", { notify_customer: true });

    expect(result.ok).toBe(true);
    expect(confirmOrder).toHaveBeenCalledWith("ord-1", { notify_customer: true });
    const state = useOrdersStore.getState();
    expect(state.columns.pending.ids).toEqual([]);
    expect(state.columns.confirmed.ids).toEqual(["ord-1"]);
    expect(state.ordersById["ord-1"].status).toBe("confirmed");
  });

  it("hace rollback completo si el backend rechaza la transición", async () => {
    const row = makeRow();
    useOrdersStore.setState({
      ordersById: { "ord-1": row },
      columns: { ...useOrdersStore.getState().columns, pending: { ...emptyColumn(), ids: ["ord-1"], total: 1 } },
    });
    (confirmOrder as jest.Mock).mockRejectedValue(new Error("stock insuficiente"));

    const result = await useOrdersStore
      .getState()
      .transition("ord-1", "confirm", { notify_customer: false });

    expect(result.ok).toBe(false);
    const state = useOrdersStore.getState();
    expect(state.columns.pending.ids).toEqual(["ord-1"]);
    expect(state.columns.confirmed.ids).toEqual([]);
    expect(state.ordersById["ord-1"].status).toBe("pending");
  });
});

describe("orders.store — refreshOrder", () => {
  it("hidrata una Row parcial con el detalle completo", async () => {
    useOrdersStore.getState().onOrderCreated(createdEvent());
    (getOrder as jest.Mock).mockResolvedValue({
      id: "ord-9",
      order_number: 99,
      status: "pending",
      contact_id: "contact-9",
      contact: { id: "contact-9", full_name: "Sofía Mejía" },
      conversation_id: "conv-9",
      subtotal_cents: 5000000,
      discount_cents: 0,
      total_cents: 5000000,
      currency: "COP",
      intake_data: null,
      notes: null,
      created_by_type: "ai_agent",
      created_by_user_id: null,
      confirmed_at: null,
      paid_at: null,
      fulfilled_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      created_at: "2026-07-11T00:00:00Z",
      updated_at: "2026-07-11T00:00:00Z",
      items: [{ id: "it-1" }],
      payments: [],
    });

    await useOrdersStore.getState().refreshOrder("ord-9");

    const state = useOrdersStore.getState();
    expect(state.ordersById["ord-9"].partial).toBeUndefined();
    expect(state.ordersById["ord-9"].contact_name).toBe("Sofía Mejía");
    expect(state.ordersById["ord-9"].items_count).toBe(1);
    expect(state.columns.pending.ids).toEqual(["ord-9"]);
  });
});
