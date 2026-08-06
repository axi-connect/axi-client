import { render, screen, waitFor } from "@testing-library/react";
import type { AutomationDTO, AutomationMetricsDTO } from "@/modules/marketing/domain/automation";
import type { CampaignDTO, CampaignStatsDTO } from "@/modules/marketing/domain/campaign";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import { useOverviewStore } from "@/modules/marketing/infrastructure/stores/overview.store";
import { MarketingOverviewView } from "../MarketingOverviewView";

/**
 * Agrupados POR ESCENARIO (ver la nota de `PromotionsView.test.tsx`): un
 * montaje por estado inicial, no por aserción.
 */

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

describe("resumen con actividad", () => {
  /** Fixture rico: 7 campañas (más del tope de 5 en vuelo) y 2 reglas, una apagada. */
  beforeEach(async () => {
    automations.listAutomations.mockResolvedValue([rule(), rule({ id: "a2", enabled: false })]);
    automations.getAutomationMetrics.mockResolvedValue(metrics());
    campaigns.listCampaigns.mockResolvedValue({
      data: [
        ...Array.from({ length: 6 }, (_, i) => campaign({ id: `c${i}`, name: `Campaña ${i}` })),
        campaign({ id: "cx", name: "Terminada", status: "completed" }),
      ],
      meta: { total: 7 },
    });
    campaigns.getCampaignStats.mockResolvedValue(stats());
    promotions.listPromotions.mockResolvedValue([] as PromotionDTO[]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 312 } });
    render(<MarketingOverviewView />);
    await screen.findByText("$ 3.940.000");
  });

  it("agrega las métricas de las reglas ENCENDIDAS y formatea el dinero", () => {
    // Centavos formateados como pesos, jamás el entero crudo.
    expect(screen.queryByText("394000000")).not.toBeInTheDocument();
    expect(automations.getAutomationMetrics).toHaveBeenCalledTimes(1);
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
    expect(screen.getByText("312")).toBeInTheDocument();
    expect(screen.getByText("31 de 118")).toBeInTheDocument();
  });

  it("pide stats solo de las campañas en vuelo, con tope, y anuncia las que deja fuera", async () => {
    // `completed` no cuesta una petición; de las 6 en vuelo solo se piden 5.
    await waitFor(() => expect(campaigns.getCampaignStats).toHaveBeenCalledTimes(5));
    expect(screen.getByText(/Y 1 más en curso/)).toBeInTheDocument();
  });

  it("el feed en vivo explica que está a la escucha cuando aún no llegó nada", () => {
    expect(screen.getByText("A la escucha")).toBeInTheDocument();
  });
});

describe("resumen sin actividad", () => {
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
    automations.listAutomations.mockRejectedValue(new Error("Se cayó la conexión"));
    campaigns.listCampaigns.mockResolvedValue({ data: [], meta: { total: 0 } });
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<MarketingOverviewView />);

    expect(
      await screen.findByText("Algunos datos no se pudieron cargar."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
