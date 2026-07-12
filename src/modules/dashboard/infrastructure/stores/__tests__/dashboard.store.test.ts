import { useDashboardStore, type DashboardPerms } from "../dashboard.store";

// Se stubbean los adapters: el store solo debe pedir lo permitido por RBAC.
jest.mock("@/modules/dashboard/infrastructure/services/dashboard-service.adapter", () => ({
  getOrderStats: jest.fn(async () => ({ counts_by_status: {}, kpis: {} })),
  getInboxCounts: jest.fn(async () => ({ queued: 0, mine: 0, ai: 0, all_open: 0, unread_total: 0 })),
  getConversationStats: jest.fn(async () => ({ series: [] })),
  getContactStats: jest.fn(async () => ({ by_stage: {}, series: [] })),
  getTopProducts: jest.fn(async () => ({ period: "7d", items: [] })),
  getUsageSummary: jest.fn(async () => ({ ai_paused: false, metrics: [], cost: { used_usd: 0 } })),
  getChannels: jest.fn(async () => ({
    data: [{ id: "ch-1", name: "WA", kind: "whatsapp_cloud", status: "connected" }],
  })),
}));

import {
  getChannels,
  getContactStats,
  getOrderStats,
} from "@/modules/dashboard/infrastructure/services/dashboard-service.adapter";

const ALL: DashboardPerms = {
  orders: true,
  conversations: true,
  contacts: true,
  usage: true,
  channels: true,
};
const NONE: DashboardPerms = {
  orders: false,
  conversations: false,
  contacts: false,
  usage: false,
  channels: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  useDashboardStore.setState({
    period: "7d",
    sales: { status: "idle", data: null, error: null },
    attention: { status: "idle", data: null, error: null },
    conversations: { status: "idle", data: null, error: null },
    customers: { status: "idle", data: null, error: null },
    topProducts: { status: "idle", data: null, error: null },
    usage: { status: "idle", data: null, error: null },
    channels: { status: "idle", data: null, error: null },
    usageAlertMetric: null,
  });
});

describe("dashboard.store — carga condicional por permiso (RBAC)", () => {
  it("con todos los permisos pide todas las secciones", async () => {
    await useDashboardStore.getState().load(ALL);
    expect(getOrderStats).toHaveBeenCalledTimes(1);
    expect(getChannels).toHaveBeenCalledTimes(1);
    expect(useDashboardStore.getState().sales.status).toBe("ready");
    expect(useDashboardStore.getState().channels.status).toBe("ready");
  });

  it("sin permisos no dispara ninguna llamada", async () => {
    await useDashboardStore.getState().load(NONE);
    expect(getOrderStats).not.toHaveBeenCalled();
    expect(getChannels).not.toHaveBeenCalled();
    expect(useDashboardStore.getState().sales.status).toBe("idle");
  });

  it("sin contacts:read no pide clientes al cambiar período", () => {
    useDashboardStore.getState().setPeriod("30d", { ...ALL, contacts: false });
    expect(getContactStats).not.toHaveBeenCalled();
    expect(useDashboardStore.getState().period).toBe("30d");
  });
});

describe("dashboard.store — reducer WS de canales", () => {
  it("actualiza el estado y nivel del canal en sitio", async () => {
    await useDashboardStore.getState().load(ALL);
    useDashboardStore.getState().onChannelStatusChanged("ch-1", "disconnected");
    const channel = useDashboardStore.getState().channels.data?.[0];
    expect(channel?.status).toBe("disconnected");
    expect(channel?.level).toBe("critical");
  });

  it("usage.alert guarda la métrica en alerta", () => {
    useDashboardStore.getState().onUsageAlert("ai_requests");
    expect(useDashboardStore.getState().usageAlertMetric).toBe("ai_requests");
  });
});
