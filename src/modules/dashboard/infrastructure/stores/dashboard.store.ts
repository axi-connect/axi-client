import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import {
  getChannels,
  getContactStats,
  getConversationStats,
  getInboxCounts,
  getOrderStats,
  getTopProducts,
  getUsageSummary,
} from "@/modules/dashboard/infrastructure/services/dashboard-service.adapter";
import {
  channelLevel,
  mapChannelsHealth,
  type ChannelHealth,
} from "@/modules/dashboard/domain/health";
import type {
  ContactStatsDTO,
  ConversationStatsDTO,
  DashboardPeriod,
  InboxCountsDTO,
  OrderStatsDTO,
  TopProductsDTO,
  UsageSummaryDTO,
} from "@/modules/dashboard/domain/dashboard";

/** Estado de una sección: los datos llegan por su propio fetch condicional. */
export type SectionStatus = "idle" | "loading" | "ready" | "error";

export interface Section<T> {
  status: SectionStatus;
  data: T | null;
  error: string | null;
}

/** Permisos que gobiernan qué secciones se piden (RBAC natural, sin 403). */
export interface DashboardPerms {
  orders: boolean;
  conversations: boolean;
  contacts: boolean;
  usage: boolean;
  channels: boolean;
}

interface DashboardState {
  period: DashboardPeriod;
  sales: Section<OrderStatsDTO>;
  attention: Section<InboxCountsDTO>;
  conversations: Section<ConversationStatsDTO>;
  customers: Section<ContactStatsDTO>;
  topProducts: Section<TopProductsDTO>;
  usage: Section<UsageSummaryDTO>;
  channels: Section<ChannelHealth[]>;
  /** Alerta de consumo recibida por WS (metric que cruzó umbral). */
  usageAlertMetric: string | null;

  setPeriod: (period: DashboardPeriod, perms: DashboardPerms) => void;
  load: (perms: DashboardPerms) => Promise<void>;
  // Reducers de tiempo real (re-fetch selectivo)
  refreshSales: () => Promise<void>;
  refreshAttention: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshTopProducts: () => Promise<void>;
  onChannelStatusChanged: (channelId: string, status: string) => void;
  onUsageUpdated: () => Promise<void>;
  onUsageAlert: (metric: string) => void;
}

const idle = <T>(): Section<T> => ({ status: "idle", data: null, error: null });

/**
 * Store del dashboard. Cada sección se pide SOLO si el rol tiene su permiso
 * (RBAC natural: nunca dispara una llamada que devolvería 403). Las secciones
 * dependientes de período (todas menos atención/salud/consumo actuales) se
 * recargan al cambiar el selector. El tiempo real hace re-fetch selectivo por
 * sección o actualiza en sitio (canales/consumo).
 */
export const useDashboardStore = create<DashboardState>((set, get) => {
  /** Ejecuta un fetch de sección envolviendo estado loading/ready/error. */
  async function run<K extends keyof DashboardState>(
    key: K,
    fetcher: () => Promise<DashboardState[K] extends Section<infer T> ? T : never>,
  ): Promise<void> {
    set({ [key]: { status: "loading", data: null, error: null } } as Partial<DashboardState>);
    try {
      const data = await fetcher();
      set({ [key]: { status: "ready", data, error: null } } as Partial<DashboardState>);
    } catch (err) {
      set({
        [key]: { status: "error", data: null, error: errorMessage(err) },
      } as Partial<DashboardState>);
    }
  }

  return {
    period: "7d",
    sales: idle(),
    attention: idle(),
    conversations: idle(),
    customers: idle(),
    topProducts: idle(),
    usage: idle(),
    channels: idle(),
    usageAlertMetric: null,

    setPeriod(period, perms) {
      set({ period });
      // Solo las secciones que dependen del período
      const tasks: Promise<void>[] = [];
      if (perms.orders) tasks.push(get().refreshSales(), get().refreshTopProducts());
      if (perms.conversations) tasks.push(get().refreshConversations());
      if (perms.contacts)
        tasks.push(
          run("customers", () => getContactStats(period)),
        );
      void Promise.all(tasks);
    },

    async load(perms) {
      const period = get().period;
      const tasks: Promise<void>[] = [];
      if (perms.orders) {
        tasks.push(
          run("sales", () => getOrderStats(period)),
          run("topProducts", () => getTopProducts(period)),
        );
      }
      if (perms.conversations) {
        tasks.push(
          run("attention", () => getInboxCounts()),
          run("conversations", () => getConversationStats(period)),
        );
      }
      if (perms.contacts) tasks.push(run("customers", () => getContactStats(period)));
      if (perms.usage) tasks.push(run("usage", () => getUsageSummary()));
      if (perms.channels) {
        tasks.push(run("channels", async () => mapChannelsHealth(await getChannels())));
      }
      await Promise.all(tasks);
    },

    refreshSales() {
      return run("sales", () => getOrderStats(get().period));
    },
    refreshAttention() {
      return run("attention", () => getInboxCounts());
    },
    refreshConversations() {
      return run("conversations", () => getConversationStats(get().period));
    },
    refreshTopProducts() {
      return run("topProducts", () => getTopProducts(get().period));
    },

    onChannelStatusChanged(channelId, status) {
      const section = get().channels;
      if (section.data === null) return;
      set({
        channels: {
          ...section,
          data: section.data.map((channel) =>
            channel.id === channelId
              ? { ...channel, status, level: channelLevel(status) }
              : channel,
          ),
        },
      });
    },

    onUsageUpdated() {
      // El summary lee Redis O(1); un re-fetch es barato y evita mantener
      // el acumulado por métrica en el cliente.
      if (get().usage.status === "idle") return Promise.resolve();
      return run("usage", () => getUsageSummary());
    },

    onUsageAlert(metric) {
      set({ usageAlertMetric: metric });
    },
  };
});
