import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import {
  getAgentPerformance,
  getAlerts,
  getFunnel,
  getJudgeAgreement,
  getTopIssues,
} from "@/modules/analytics/infrastructure/services/analytics-service.adapter";
import type { AnalyticsEvaluationCompletedEvent } from "@/core/realtime/events";
import type {
  AgentPerformanceDTO,
  AlertRowDTO,
  AlertStatus,
  AnalyticsPeriod,
  FunnelDTO,
  FunnelGroup,
  FunnelGroupBy,
  IssuesTopDTO,
  JudgeAgreementDTO,
} from "@/modules/analytics/domain/analytics";

/** Estado de una sección (patrón dashboard.store): carga lazy e independiente. */
export type SectionStatus = "idle" | "loading" | "ready" | "error";

export interface Section<T> {
  status: SectionStatus;
  data: T | null;
  error: string | null;
}

const idle = <T>(): Section<T> => ({ status: "idle", data: null, error: null });

const loading = <T>(prev: Section<T>): Section<T> => ({
  status: "loading",
  // Conservamos los datos anteriores: el refetch por período usa shimmer
  // sobre datos viejos, nunca skeleton (el layout no salta, plan §4.5).
  data: prev.data,
  error: null,
});

interface AnalyticsState {
  period: AnalyticsPeriod;

  // ── Tab Conversión (funnel determinista) ──
  /** Funnel del período; el fetch inicial trae el desglose por agente. */
  funnel: Section<FunnelDTO>;
  /** Desglose activo de "¿Quién convierte mejor?". */
  groupBy: FunnelGroupBy;
  /** Cache por dimensión: agente se siembra del funnel; canal/intención lazy. */
  groups: Record<FunnelGroupBy, Section<FunnelGroup[]>>;

  // ── Tab Calidad (LLM-judge) ──
  performance: Section<AgentPerformanceDTO>;
  topIssues: Section<IssuesTopDTO>;
  judgeAgreement: Section<JudgeAgreementDTO>;

  // ── Alertas (transversal) ──
  /** Conteo de alertas activas: alimenta badge del tab + banner en los 3 tabs. */
  triggeredCount: number | null;
  alertsStatus: AlertStatus;
  alerts: Section<AlertRowDTO[]>;

  /** Último WS `analytics.evaluation_completed` (el Sheet abierto lo consume). */
  lastEvaluationCompleted: AnalyticsEvaluationCompletedEvent | null;

  setPeriod: (period: AnalyticsPeriod) => void;
  loadConversion: () => Promise<void>;
  setGroupBy: (groupBy: FunnelGroupBy) => void;
  loadQuality: () => Promise<void>;
  refreshQuality: () => Promise<void>;
  /** Tras una calibración: el acuerdo juez-humano cambió. */
  refreshJudgeAgreement: () => Promise<void>;
  loadAlertsBadge: () => Promise<void>;
  loadAlerts: (status?: AlertStatus) => Promise<void>;
  /** Ack optimista: saca la alerta de la lista y decrementa el badge. */
  removeAlert: (alertId: string) => void;
  /** WS `analytics.alert`: el badge sube al instante (la lista re-fetchea aparte). */
  onAlertTriggered: () => void;
  /** WS `analytics.evaluation_completed`: publica el evento para la UI. */
  onEvaluationCompleted: (payload: AnalyticsEvaluationCompletedEvent) => void;
}

/**
 * Store de la sección Analíticas. Tres planos con carga lazy por tab (cada
 * sección queda `ready` y no se repide al volver); cambiar el período re-fetchea
 * SOLO las secciones ya pedidas (`status !== 'idle'`). El badge de alertas se
 * pide al montar la sección porque es visible en los tres tabs.
 */
export const useAnalyticsStore = create<AnalyticsState>((set, get) => {
  /** Envuelve un fetch de sección top-level con loading/ready/error. */
  async function run<K extends "funnel" | "performance" | "topIssues" | "judgeAgreement" | "alerts">(
    key: K,
    fetcher: () => Promise<NonNullable<AnalyticsState[K]["data"]>>,
  ): Promise<void> {
    set({ [key]: loading(get()[key] as Section<unknown>) } as Partial<AnalyticsState>);
    try {
      const data = await fetcher();
      set({ [key]: { status: "ready", data, error: null } } as Partial<AnalyticsState>);
    } catch (err) {
      set({
        [key]: { status: "error", data: null, error: errorMessage(err) },
      } as Partial<AnalyticsState>);
    }
  }

  /** Fetch del funnel con desglose por agente (siembra groups.agent). */
  async function fetchFunnel(): Promise<void> {
    const { funnel, groups } = get();
    set({
      funnel: loading(funnel),
      groups: { ...groups, agent: loading(groups.agent) },
    });
    try {
      const data = await getFunnel(get().period, "agent");
      set({
        funnel: { status: "ready", data, error: null },
        groups: {
          ...get().groups,
          agent: { status: "ready", data: data.groups ?? [], error: null },
        },
      });
    } catch (err) {
      const error = errorMessage(err);
      set({
        funnel: { status: "error", data: null, error },
        groups: { ...get().groups, agent: { status: "error", data: null, error } },
      });
    }
  }

  /** Fetch lazy del desglose canal/intención (el funnel global no cambia). */
  async function fetchGroups(groupBy: FunnelGroupBy): Promise<void> {
    set({ groups: { ...get().groups, [groupBy]: loading(get().groups[groupBy]) } });
    try {
      const data = await getFunnel(get().period, groupBy);
      set({
        groups: {
          ...get().groups,
          [groupBy]: { status: "ready", data: data.groups ?? [], error: null },
        },
      });
    } catch (err) {
      set({
        groups: {
          ...get().groups,
          [groupBy]: { status: "error", data: null, error: errorMessage(err) },
        },
      });
    }
  }

  return {
    period: "30d",

    funnel: idle(),
    groupBy: "agent",
    groups: { agent: idle(), channel: idle(), intention: idle() },

    performance: idle(),
    topIssues: idle(),
    judgeAgreement: idle(),

    triggeredCount: null,
    alertsStatus: "triggered",
    alerts: idle(),
    lastEvaluationCompleted: null,

    setPeriod(period) {
      if (period === get().period) return;
      set({ period });
      const { funnel, performance, topIssues, groupBy, groups } = get();
      const tasks: Promise<void>[] = [];
      // Solo re-fetch de lo ya pedido; el resto sigue lazy en su tab.
      if (funnel.status !== "idle") tasks.push(fetchFunnel());
      if (groupBy !== "agent" && groups[groupBy].status !== "idle") {
        tasks.push(fetchGroups(groupBy));
      }
      // Los desgloses no activos quedan obsoletos: vuelven a idle (lazy).
      set({
        groups: {
          agent: get().groups.agent,
          channel: groupBy === "channel" ? get().groups.channel : idle(),
          intention: groupBy === "intention" ? get().groups.intention : idle(),
        },
      });
      if (performance.status !== "idle") {
        tasks.push(run("performance", () => getAgentPerformance(period)));
      }
      if (topIssues.status !== "idle") {
        tasks.push(run("topIssues", () => getTopIssues(period)));
      }
      void Promise.all(tasks);
    },

    async loadConversion() {
      const status = get().funnel.status;
      // Lazy con cache (ready) y sin dobles disparos (loading); error reintenta.
      if (status === "ready" || status === "loading") return;
      await fetchFunnel();
    },

    setGroupBy(groupBy) {
      set({ groupBy });
      const status = get().groups[groupBy].status;
      if (status === "idle" || status === "error") void fetchGroups(groupBy);
    },

    async loadQuality() {
      const { performance, topIssues, judgeAgreement, period } = get();
      const pending = (status: SectionStatus) => status === "idle" || status === "error";
      const tasks: Promise<void>[] = [];
      if (pending(performance.status)) {
        tasks.push(run("performance", () => getAgentPerformance(period)));
      }
      if (pending(topIssues.status)) {
        tasks.push(run("topIssues", () => getTopIssues(period)));
      }
      if (pending(judgeAgreement.status)) {
        tasks.push(run("judgeAgreement", () => getJudgeAgreement()));
      }
      await Promise.all(tasks);
    },

    /** Re-fetch de Calidad tras un WS `analytics.evaluation_completed`. */
    async refreshQuality() {
      const { performance, topIssues, period } = get();
      const tasks: Promise<void>[] = [];
      if (performance.status !== "idle") {
        tasks.push(run("performance", () => getAgentPerformance(period)));
      }
      if (topIssues.status !== "idle") {
        tasks.push(run("topIssues", () => getTopIssues(period)));
      }
      await Promise.all(tasks);
    },

    async refreshJudgeAgreement() {
      if (get().judgeAgreement.status === "idle") return;
      await run("judgeAgreement", () => getJudgeAgreement());
    },

    async loadAlertsBadge() {
      try {
        const list = await getAlerts("triggered");
        set({ triggeredCount: list.meta.total });
      } catch {
        // El badge es informativo: un fallo aquí no debe romper la sección.
        set({ triggeredCount: null });
      }
    },

    async loadAlerts(status) {
      const next = status ?? get().alertsStatus;
      set({ alertsStatus: next });
      await run("alerts", async () => (await getAlerts(next)).data);
      if (next === "triggered") {
        const alerts = get().alerts;
        if (alerts.status === "ready" && alerts.data) {
          set({ triggeredCount: alerts.data.length });
        }
      }
    },

    removeAlert(alertId) {
      const { alerts, triggeredCount, alertsStatus } = get();
      if (alerts.data !== null) {
        set({
          alerts: { ...alerts, data: alerts.data.filter((a) => a.id !== alertId) },
        });
      }
      if (alertsStatus === "triggered" && triggeredCount !== null && triggeredCount > 0) {
        set({ triggeredCount: triggeredCount - 1 });
      }
    },

    onAlertTriggered() {
      set({ triggeredCount: (get().triggeredCount ?? 0) + 1 });
    },

    onEvaluationCompleted(payload) {
      set({ lastEvaluationCompleted: payload });
    },
  };
});
