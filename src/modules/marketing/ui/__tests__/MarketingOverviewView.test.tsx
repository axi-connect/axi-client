import { render, screen, waitFor } from "@testing-library/react";
import type { AutomationDTO, AutomationMetricsDTO } from "@/modules/marketing/domain/automation";
import type { CampaignDTO, CampaignStatsDTO } from "@/modules/marketing/domain/campaign";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import { useOverviewStore } from "@/modules/marketing/infrastructure/stores/overview.store";
import { MarketingOverviewView } from "../MarketingOverviewView";

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

jest.mock("@/modules/marketing/infrastructure/realtime/use-marketing-socket", () => ({
  useMarketingSocket: () => ({ connected: true }),
}));

jest.mock("@/modules/marketing/infrastructure/services/automations-service.adapter", () => ({
  listAutomations: jest.fn(),
  getAutomationMetrics: jest.fn(),
}));
jest.mock("@/modules/marketing/infrastructure/services/campaigns-service.adapter", () => ({
  listCampaigns: jest.fn(),
  getCampaignStats: jest.fn(),
}));
jest.mock("@/modules/marketing/infrastructure/services/promotions-service.adapter", () => ({
  listPromotions: jest.fn(),
}));
jest.mock("@/modules/marketing/infrastructure/services/opt-outs-service.adapter", () => ({
  listOptOuts: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const automations = require("@/modules/marketing/infrastructure/services/automations-service.adapter") as {
  listAutomations: jest.Mock;
  getAutomationMetrics: jest.Mock;
};
const campaigns = require("@/modules/marketing/infrastructure/services/campaigns-service.adapter") as {
  listCampaigns: jest.Mock;
  getCampaignStats: jest.Mock;
};
const promotions = require("@/modules/marketing/infrastructure/services/promotions-service.adapter") as {
  listPromotions: jest.Mock;
};
const optOuts = require("@/modules/marketing/infrastructure/services/opt-outs-service.adapter") as {
  listOptOuts: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function rule(over: Partial<AutomationDTO> = {}): AutomationDTO {
  return {
    id: "a1",
    name: "Carrito con cupón",
    trigger_type: "cart_abandoned",
    delay_minutes: 15,
    priority: 1,
    conditions: {},
    promotion: null,
    message_template: "Hola",
    hsm_template_name: null,
    hsm_template_language: null,
    attribution_window_hours: 168,
    enabled: true,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...over,
  } as AutomationDTO;
}

function metrics(over: Partial<AutomationMetricsDTO> = {}): AutomationMetricsDTO {
  return {
    automation_id: "a1",
    sent: 128,
    skipped: 14,
    skipped_by_reason: {},
    converted: 31,
    conversion_rate: 0.242,
    attributed_revenue_cents: 394_000_000,
    coupons_issued: 118,
    coupons_redeemed: 31,
    ...over,
  } as AutomationMetricsDTO;
}

function campaign(over: Partial<CampaignDTO> = {}): CampaignDTO {
  return {
    id: "c1",
    name: "Black Friday",
    status: "running",
    audience_total: 1200,
    ...over,
  } as CampaignDTO;
}

function stats(over: Partial<CampaignStatsDTO> = {}): CampaignStatsDTO {
  return {
    campaign_id: "c1",
    audience_total: 1200,
    pending: 260,
    queued: 15,
    sent: 200,
    delivered: 400,
    read: 300,
    failed: 25,
    skipped: 0,
    skipped_by_reason: {},
    replies: 180,
    conversions: 45,
    revenue_cents: 450_000_000,
    delivery_rate: 0.74,
    reply_rate: 0.15,
    conversion_rate: 0.037,
    ...over,
  } as CampaignStatsDTO;
}

function resetStore() {
  useOverviewStore.setState({
    automations: { status: "idle", data: null, error: null },
    recovery: { status: "idle", data: null, error: null },
    promotions: { status: "idle", data: null, error: null },
    optOutsTotal: { status: "idle", data: null, error: null },
    liveCampaigns: { status: "idle", data: null, error: null },
    liveCampaignsOmitted: 0,
    feed: [],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe("MarketingOverviewView", () => {
  it("agrega las métricas de las reglas activas y muestra el dinero en pesos", async () => {
    automations.listAutomations.mockResolvedValue([rule(), rule({ id: "a2", enabled: false })]);
    automations.getAutomationMetrics.mockResolvedValue(metrics());
    campaigns.listCampaigns.mockResolvedValue({ data: [campaign()], meta: { total: 1 } });
    campaigns.getCampaignStats.mockResolvedValue(stats());
    promotions.listPromotions.mockResolvedValue([] as PromotionDTO[]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 312 } });

    render(<MarketingOverviewView />);

    // Centavos formateados como pesos, jamás el entero crudo.
    expect(await screen.findByText("$ 3.940.000")).toBeInTheDocument();
    expect(screen.queryByText("394000000")).not.toBeInTheDocument();
    // Solo se piden métricas de las reglas ENCENDIDAS.
    expect(automations.getAutomationMetrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
    expect(screen.getByText("312")).toBeInTheDocument();
    expect(screen.getByText("31 de 118")).toBeInTheDocument();
  });

  it("pide stats SOLO de las campañas en vuelo, no de toda la lista", async () => {
    automations.listAutomations.mockResolvedValue([]);
    campaigns.listCampaigns.mockResolvedValue({
      data: [
        campaign(),
        campaign({ id: "c2", status: "completed" }),
        campaign({ id: "c3", status: "draft" }),
        campaign({ id: "c4", status: "paused" }),
      ],
      meta: { total: 4 },
    });
    campaigns.getCampaignStats.mockResolvedValue(stats());
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<MarketingOverviewView />);

    await screen.findAllByText("Black Friday");
    // running + paused = 2. `completed` y `draft` no cuestan una petición.
    expect(campaigns.getCampaignStats).toHaveBeenCalledTimes(2);
  });

  it("invita a empezar cuando el tenant no tiene nada configurado", async () => {
    automations.listAutomations.mockResolvedValue([]);
    campaigns.listCampaigns.mockResolvedValue({ data: [], meta: { total: 0 } });
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<MarketingOverviewView />);

    expect(await screen.findByText("Aún no recuperas ventas")).toBeInTheDocument();
    expect(screen.getByText("Crear mi primera regla")).toBeInTheDocument();
  });

  it("informa del fallo con reintento en vez de dejar la pantalla en blanco", async () => {
    automations.listAutomations.mockRejectedValue(new Error("boom"));
    campaigns.listCampaigns.mockResolvedValue({ data: [], meta: { total: 0 } });
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<MarketingOverviewView />);

    expect(
      await screen.findByText("Algunos datos no se pudieron cargar."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("avisa de las campañas en curso que deja fuera el tope, en vez de ocultarlas", async () => {
    automations.listAutomations.mockResolvedValue([]);
    campaigns.listCampaigns.mockResolvedValue({
      data: Array.from({ length: 7 }, (_, i) => campaign({ id: `c${i}`, name: `Campaña ${i}` })),
      meta: { total: 7 },
    });
    campaigns.getCampaignStats.mockResolvedValue(stats());
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<MarketingOverviewView />);

    await waitFor(() => expect(campaigns.getCampaignStats).toHaveBeenCalledTimes(5));
    expect(screen.getByText(/Y 2 más en curso/)).toBeInTheDocument();
  });

  it("el feed en vivo explica que está a la escucha cuando aún no llegó nada", async () => {
    automations.listAutomations.mockResolvedValue([rule()]);
    automations.getAutomationMetrics.mockResolvedValue(metrics());
    campaigns.listCampaigns.mockResolvedValue({ data: [campaign()], meta: { total: 1 } });
    campaigns.getCampaignStats.mockResolvedValue(stats());
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<MarketingOverviewView />);

    expect(await screen.findByText("A la escucha")).toBeInTheDocument();
  });
});
