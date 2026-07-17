import { useAnalyticsStore } from "../analytics.store";

// Se stubbean los adapters: el store decide QUÉ y CUÁNDO pedir (lazy + período).
jest.mock("@/modules/analytics/infrastructure/services/analytics-service.adapter", () => ({
  getFunnel: jest.fn(async (_period: string, groupBy?: string) => ({
    period: "30d",
    period_start: null,
    period_end: null,
    currency: "COP",
    stages: { conversations: 10, closed_won: 2, revenue_paid_cents: 100 },
    rates: { close_rate_paid: 20 },
    series: [],
    groups: groupBy ? [{ key: "a", label: "Sofía", stages: {}, rates: {} }] : undefined,
  })),
  getAgentPerformance: jest.fn(async () => ({ period: "30d", agents: [] })),
  getTopIssues: jest.fn(async () => ({ period: "30d", issues: [] })),
  getJudgeAgreement: jest.fn(async () => ({ versions: [] })),
  getAlerts: jest.fn(async () => ({
    data: [{ id: "al-1", rule: "ai_failures_spike", status: "triggered" }],
    meta: { total: 1, page: 1, page_size: 100 },
  })),
}));

import {
  getAgentPerformance,
  getAlerts,
  getFunnel,
  getJudgeAgreement,
  getTopIssues,
} from "@/modules/analytics/infrastructure/services/analytics-service.adapter";

const idle = { status: "idle" as const, data: null, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  useAnalyticsStore.setState({
    period: "30d",
    funnel: idle,
    groupBy: "agent",
    groups: { agent: idle, channel: idle, intention: idle },
    performance: idle,
    topIssues: idle,
    judgeAgreement: idle,
    triggeredCount: null,
    alertsStatus: "triggered",
    alerts: idle,
  });
});

describe("analytics.store — carga lazy con cache por tab", () => {
  it("loadConversion pide el funnel con desglose por agente y lo siembra", async () => {
    await useAnalyticsStore.getState().loadConversion();
    expect(getFunnel).toHaveBeenCalledWith("30d", "agent");
    const state = useAnalyticsStore.getState();
    expect(state.funnel.status).toBe("ready");
    expect(state.groups.agent.status).toBe("ready");
    expect(state.groups.agent.data).toHaveLength(1);
  });

  it("loadConversion NO re-fetchea si ya está ready (cache de tab)", async () => {
    await useAnalyticsStore.getState().loadConversion();
    await useAnalyticsStore.getState().loadConversion();
    expect(getFunnel).toHaveBeenCalledTimes(1);
  });

  it("loadConversion SÍ reintenta después de un error", async () => {
    (getFunnel as jest.Mock).mockRejectedValueOnce(new Error("boom"));
    await useAnalyticsStore.getState().loadConversion();
    expect(useAnalyticsStore.getState().funnel.status).toBe("error");
    await useAnalyticsStore.getState().loadConversion();
    expect(useAnalyticsStore.getState().funnel.status).toBe("ready");
  });

  it("setGroupBy hace fetch lazy solo de la dimensión nueva", async () => {
    await useAnalyticsStore.getState().loadConversion();
    useAnalyticsStore.getState().setGroupBy("channel");
    await Promise.resolve();
    expect(getFunnel).toHaveBeenLastCalledWith("30d", "channel");
    // Volver a agente no re-fetchea (ya sembrado).
    useAnalyticsStore.getState().setGroupBy("agent");
    expect(getFunnel).toHaveBeenCalledTimes(2);
  });

  it("loadQuality pide performance + issues + agreement una sola vez", async () => {
    await useAnalyticsStore.getState().loadQuality();
    await useAnalyticsStore.getState().loadQuality();
    expect(getAgentPerformance).toHaveBeenCalledTimes(1);
    expect(getTopIssues).toHaveBeenCalledTimes(1);
    expect(getJudgeAgreement).toHaveBeenCalledTimes(1);
  });
});

describe("analytics.store — cambio de período (re-fetch selectivo)", () => {
  it("solo re-fetchea las secciones ya pedidas", async () => {
    await useAnalyticsStore.getState().loadConversion();
    jest.clearAllMocks();
    useAnalyticsStore.getState().setPeriod("7d");
    await Promise.resolve();
    expect(getFunnel).toHaveBeenCalledWith("7d", "agent");
    // Calidad nunca se pidió → sigue lazy.
    expect(getAgentPerformance).not.toHaveBeenCalled();
    expect(getTopIssues).not.toHaveBeenCalled();
  });

  it("el mismo período no dispara nada", async () => {
    await useAnalyticsStore.getState().loadConversion();
    jest.clearAllMocks();
    useAnalyticsStore.getState().setPeriod("30d");
    expect(getFunnel).not.toHaveBeenCalled();
  });

  it("los desgloses no activos vuelven a idle (lazy) al cambiar período", async () => {
    await useAnalyticsStore.getState().loadConversion();
    useAnalyticsStore.getState().setGroupBy("channel");
    await Promise.resolve();
    useAnalyticsStore.getState().setGroupBy("agent");
    useAnalyticsStore.getState().setPeriod("90d");
    expect(useAnalyticsStore.getState().groups.channel.status).toBe("idle");
  });
});

describe("analytics.store — alertas (badge + reducers WS)", () => {
  it("loadAlertsBadge fija el conteo de activas", async () => {
    await useAnalyticsStore.getState().loadAlertsBadge();
    expect(getAlerts).toHaveBeenCalledWith("triggered");
    expect(useAnalyticsStore.getState().triggeredCount).toBe(1);
  });

  it("onAlertTriggered incrementa el badge al instante", () => {
    useAnalyticsStore.getState().onAlertTriggered();
    useAnalyticsStore.getState().onAlertTriggered();
    expect(useAnalyticsStore.getState().triggeredCount).toBe(2);
  });

  it("removeAlert saca la fila y decrementa el badge (ack optimista)", async () => {
    await useAnalyticsStore.getState().loadAlerts("triggered");
    expect(useAnalyticsStore.getState().alerts.data).toHaveLength(1);
    useAnalyticsStore.getState().removeAlert("al-1");
    expect(useAnalyticsStore.getState().alerts.data).toHaveLength(0);
    expect(useAnalyticsStore.getState().triggeredCount).toBe(0);
  });
});
