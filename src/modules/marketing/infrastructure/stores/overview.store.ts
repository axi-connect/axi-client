import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  MarketingAutomationTriggeredEvent,
  MarketingCampaignProgressEvent,
  MarketingCampaignStatusChangedEvent,
  MarketingOptOutCreatedEvent,
} from "@/core/realtime/events";
import type {
  AutomationDTO,
  AutomationMetricsDTO,
} from "@/modules/marketing/domain/automation";
import type { CampaignDTO, CampaignStatsDTO } from "@/modules/marketing/domain/campaign";
import { isCampaignLive } from "@/modules/marketing/domain/campaign-state";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import {
  getAutomationMetrics,
  listAutomations,
} from "@/modules/marketing/infrastructure/services/automations-service.adapter";
import {
  getCampaignStats,
  listCampaigns,
} from "@/modules/marketing/infrastructure/services/campaigns-service.adapter";
import { listOptOuts } from "@/modules/marketing/infrastructure/services/opt-outs-service.adapter";
import { listPromotions } from "@/modules/marketing/infrastructure/services/promotions-service.adapter";

/** Estado de una sección (mismo patrón que analytics/dashboard). */
export type SectionStatus = "idle" | "loading" | "ready" | "error";

export interface Section<T> {
  status: SectionStatus;
  data: T | null;
  error: string | null;
}

const idle = <T,>(): Section<T> => ({ status: "idle", data: null, error: null });

/** Conserva los datos previos: el refetch atenúa, no vacía la pantalla. */
const loading = <T,>(prev: Section<T>): Section<T> => ({
  status: "loading",
  data: prev.data,
  error: null,
});

const ready = <T,>(data: T): Section<T> => ({ status: "ready", data, error: null });

const failed = <T,>(prev: Section<T>, error: unknown): Section<T> => ({
  status: "error",
  data: prev.data,
  error: errorMessage(error),
});

/**
 * Tope de campañas a las que se les piden stats.
 *
 * El listado NO trae el funnel, así que cada tarjeta "en curso" cuesta una
 * petición extra. Se piden solo las que están en vuelo y como mucho cinco: un
 * tenant con veinte campañas activas no puede convertir el resumen en veinte
 * round-trips. Si hay más, la vista lo dice en vez de callárselo.
 */
export const LIVE_CAMPAIGNS_CAP = 5;

/** Reglas a las que se les piden métricas (una petición por regla). */
export const AUTOMATION_METRICS_CAP = 10;

export type LiveCampaign = {
  campaign: CampaignDTO;
  stats: CampaignStatsDTO | null;
};

/** Lo que se pinta en el feed "Recuperación en vivo" (solo del WS). */
export type RecoveryFeedEntry = MarketingAutomationTriggeredEvent & {
  /** Momento en que llegó el evento; el payload no trae timestamp. */
  received_at: string;
};

const FEED_MAX = 12;

/** Agregados que el resumen deriva de las métricas por regla. */
export type RecoveryTotals = {
  sent: number;
  converted: number;
  attributed_revenue_cents: number;
  coupons_issued: number;
  coupons_redeemed: number;
  /** Reglas cuyas métricas se pidieron (para poder decir "sobre N reglas"). */
  measured: number;
  /** Reglas activas que se dejaron fuera por el tope. */
  omitted: number;
};

interface OverviewState {
  automations: Section<AutomationDTO[]>;
  recovery: Section<RecoveryTotals>;
  promotions: Section<PromotionDTO[]>;
  optOutsTotal: Section<number>;
  liveCampaigns: Section<LiveCampaign[]>;
  /** Campañas en vuelo por encima del tope: se avisa, no se ocultan en silencio. */
  liveCampaignsOmitted: number;
  feed: RecoveryFeedEntry[];

  load: () => Promise<void>;
  refreshLiveCampaigns: () => Promise<void>;
  refreshCampaignStats: (campaignId: string) => Promise<void>;
  onCampaignStatusChanged: (payload: MarketingCampaignStatusChangedEvent) => void;
  onCampaignProgress: (payload: MarketingCampaignProgressEvent) => void;
  onAutomationTriggered: (payload: MarketingAutomationTriggeredEvent, at: string) => void;
  onOptOutCreated: (payload: MarketingOptOutCreatedEvent) => void;
}

function sumMetrics(
  metrics: AutomationMetricsDTO[],
  measured: number,
  omitted: number,
): RecoveryTotals {
  return metrics.reduce<RecoveryTotals>(
    (acc, m) => ({
      sent: acc.sent + m.sent,
      converted: acc.converted + m.converted,
      attributed_revenue_cents: acc.attributed_revenue_cents + m.attributed_revenue_cents,
      coupons_issued: acc.coupons_issued + m.coupons_issued,
      coupons_redeemed: acc.coupons_redeemed + m.coupons_redeemed,
      measured,
      omitted,
    }),
    {
      sent: 0,
      converted: 0,
      attributed_revenue_cents: 0,
      coupons_issued: 0,
      coupons_redeemed: 0,
      measured,
      omitted,
    },
  );
}

export const useOverviewStore = create<OverviewState>((set, get) => ({
  automations: idle<AutomationDTO[]>(),
  recovery: idle<RecoveryTotals>(),
  promotions: idle<PromotionDTO[]>(),
  optOutsTotal: idle<number>(),
  liveCampaigns: idle<LiveCampaign[]>(),
  liveCampaignsOmitted: 0,
  feed: [],

  async load() {
    set((s) => ({
      automations: loading(s.automations),
      recovery: loading(s.recovery),
      promotions: loading(s.promotions),
      optOutsTotal: loading(s.optOutsTotal),
      liveCampaigns: loading(s.liveCampaigns),
    }));

    // Los cuatro bloques son independientes: que uno falle no debe dejar la
    // pantalla en blanco. Cada uno guarda su propio error.
    await Promise.all([
      (async () => {
        try {
          const automations = await listAutomations();
          set({ automations: ready(automations) });

          const enabled = automations.filter((a) => a.enabled);
          const measured = enabled.slice(0, AUTOMATION_METRICS_CAP);
          const metrics = await Promise.all(
            measured.map((a) => getAutomationMetrics(a.id)),
          );
          set({
            recovery: ready(
              sumMetrics(metrics, measured.length, enabled.length - measured.length),
            ),
          });
        } catch (error) {
          set((s) => ({
            automations: failed(s.automations, error),
            recovery: failed(s.recovery, error),
          }));
        }
      })(),

      (async () => {
        try {
          set({ promotions: ready(await listPromotions()) });
        } catch (error) {
          set((s) => ({ promotions: failed(s.promotions, error) }));
        }
      })(),

      (async () => {
        try {
          // page_size 1: solo interesa `meta.total`, no las filas.
          const res = await listOptOuts({ active_only: true, page: 1, page_size: 1 });
          set({ optOutsTotal: ready(res.meta.total) });
        } catch (error) {
          set((s) => ({ optOutsTotal: failed(s.optOutsTotal, error) }));
        }
      })(),

      get().refreshLiveCampaigns(),
    ]);
  },

  async refreshLiveCampaigns() {
    set((s) => ({ liveCampaigns: loading(s.liveCampaigns) }));
    try {
      const res = await listCampaigns({ page: 1, page_size: 25 });
      const live = res.data.filter((c) => isCampaignLive(c.status));
      const shown = live.slice(0, LIVE_CAMPAIGNS_CAP);
      const stats = await Promise.all(
        shown.map((c) =>
          // Una campaña sin stats no debe tumbar el bloque entero.
          getCampaignStats(c.id).catch(() => null),
        ),
      );
      set({
        liveCampaigns: ready(
          shown.map((campaign, i) => ({ campaign, stats: stats[i] })),
        ),
        liveCampaignsOmitted: live.length - shown.length,
      });
    } catch (error) {
      set((s) => ({ liveCampaigns: failed(s.liveCampaigns, error) }));
    }
  },

  async refreshCampaignStats(campaignId) {
    const current = get().liveCampaigns.data;
    if (!current?.some((c) => c.campaign.id === campaignId)) return;
    try {
      const stats = await getCampaignStats(campaignId);
      set((s) => ({
        liveCampaigns: s.liveCampaigns.data
          ? ready(
              s.liveCampaigns.data.map((c) =>
                c.campaign.id === campaignId ? { ...c, stats } : c,
              ),
            )
          : s.liveCampaigns,
      }));
    } catch {
      // Un fallo de refresco puntual no cambia la pantalla: el siguiente tick
      // lo vuelve a intentar y el dato viejo sigue siendo mejor que un hueco.
    }
  },

  onCampaignStatusChanged(payload) {
    const current = get().liveCampaigns.data;
    const known = current?.find((c) => c.campaign.id === payload.campaign_id);
    // Una campaña que entra en vuelo (o sale) cambia la COMPOSICIÓN de la
    // lista, no solo una fila: hay que recomponerla.
    if (!known || !isCampaignLive(payload.status)) {
      void get().refreshLiveCampaigns();
      return;
    }
    set((s) => ({
      liveCampaigns: s.liveCampaigns.data
        ? ready(
            s.liveCampaigns.data.map((c) =>
              c.campaign.id === payload.campaign_id
                ? { ...c, campaign: { ...c.campaign, status: payload.status } }
                : c,
            ),
          )
        : s.liveCampaigns,
    }));
  },

  onCampaignProgress(payload) {
    // El fan-out terminó: las stats cambiaron de golpe. Refresco dirigido a esa
    // campaña, nunca una invalidación global.
    void get().refreshCampaignStats(payload.campaign_id);
  },

  onAutomationTriggered(payload, at) {
    set((s) => ({
      feed: [{ ...payload, received_at: at }, ...s.feed].slice(0, FEED_MAX),
      // Un envío suma a los totales sin esperar al siguiente `load`; los
      // omitidos no mueven ninguna cifra del resumen.
      recovery:
        payload.status === "sent" && s.recovery.data
          ? ready({ ...s.recovery.data, sent: s.recovery.data.sent + 1 })
          : s.recovery,
    }));
  },

  onOptOutCreated() {
    set((s) => ({
      optOutsTotal: s.optOutsTotal.data !== null ? ready(s.optOutsTotal.data + 1) : s.optOutsTotal,
    }));
  },
}));
