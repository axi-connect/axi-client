import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AutomationDTO, AutomationMetricsDTO } from "@/modules/marketing/domain/automation";
import type { CampaignDTO, CampaignStatsDTO } from "@/modules/marketing/domain/campaign";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import { useOverviewStore } from "@/modules/marketing/infrastructure/stores/overview.store";
import { MarketingOverviewView } from "../MarketingOverviewView";

/**
 * Agrupados POR ESCENARIO (ver la nota de `PromotionsView.test.tsx`): un
 * montaje por estado inicial, no por aserción.
 */

jest.mock("next/navigation", () => ({ usePathname: () => "/marketing", useRouter: () => ({ push: jest.fn() }) }));

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
jest.mock("@/modules/marketing/infrastructure/services/templates-service.adapter", () => ({
  listHsmTemplates: jest.fn(),
  getMessagingWindow: jest.fn(),
}));
jest.mock("@/modules/channels/public", () => ({ listChannels: jest.fn() }));

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
const templates = require("@/modules/marketing/infrastructure/services/templates-service.adapter") as {
  listHsmTemplates: jest.Mock;
  getMessagingWindow: jest.Mock;
};
const channels = require("@/modules/channels/public") as { listChannels: jest.Mock };
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
    drafts: { status: "idle", data: null, error: null },
    meta: { status: "idle", data: null, error: null },
    liveCampaignsOmitted: 0,
    feed: [],
  });
}

/** `listCampaigns` según lo que se pida: la lista para «en curso» o solo el total de borradores. */
function campaignsReturn(list: CampaignDTO[], drafts: number) {
  campaigns.listCampaigns.mockImplementation((params: { status?: string }) =>
    Promise.resolve(params.status === "draft" ? { data: [], meta: { total: drafts } } : { data: list, meta: { total: list.length } }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
  channels.listChannels.mockResolvedValue({ data: [{ id: "ch1", name: "Ventas", kind: "whatsapp_cloud" }] });
  templates.listHsmTemplates.mockResolvedValue([
    { id: "h1", name: "promo_ok", approval_status: "approved" },
    { id: "h2", name: "promo_septiembre", approval_status: "rejected" },
  ]);
  templates.getMessagingWindow.mockResolvedValue({ limit: 1000, used: 170, remaining: 830 });
});

describe("resumen con actividad", () => {
  /** Fixture rico: 7 campañas (más del tope de 5 en vuelo), 2 reglas (una apagada), 2 borradores y una plantilla rechazada. */
  beforeEach(async () => {
    automations.listAutomations.mockResolvedValue([rule(), rule({ id: "a2", enabled: false })]);
    automations.getAutomationMetrics.mockResolvedValue(metrics());
    campaignsReturn(
      [
        ...Array.from({ length: 6 }, (_, i) => campaign({ id: `c${i}`, name: `Campaña ${i}` })),
        campaign({ id: "cx", name: "Terminada", status: "completed" }),
      ],
      2,
    );
    campaigns.getCampaignStats.mockResolvedValue(stats());
    promotions.listPromotions.mockResolvedValue([] as PromotionDTO[]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 312 } });
    render(<MarketingOverviewView />);
    await screen.findByText("en 31 pedidos pagados");
  });

  it("agrega las métricas de las reglas ENCENDIDAS, en millones y por disparador", () => {
    const recovered = within(screen.getByText("Recuperado por tus reglas").closest("section")!);
    // Centavos formateados como pesos, jamás el entero crudo.
    expect(screen.queryByText("394000000")).not.toBeInTheDocument();
    expect(automations.getAutomationMetrics).toHaveBeenCalledTimes(1);
    expect(recovered.getByText("1 de 2 reglas encendidas")).toBeInTheDocument();
    // El total y la fila de su disparador (carrito) dicen lo mismo; los otros dos, cero.
    expect(recovered.getAllByText("$ 3,9 M")).toHaveLength(2);
    expect(recovered.getAllByText("$ 0")).toHaveLength(2);
    expect(recovered.getByText("de 118 enviados")).toBeInTheDocument();
    expect(screen.getByText("312")).toBeInTheDocument();
  });

  it("pide stats solo de las campañas en vuelo, con tope, y anuncia las que deja fuera", async () => {
    // `completed` no cuesta una petición; de las 6 en vuelo solo se piden 5.
    await waitFor(() => expect(campaigns.getCampaignStats).toHaveBeenCalledTimes(5));
    expect(screen.getByText(/Y 1 más en curso/)).toBeInTheDocument();
  });

  it("«Lo próximo» ordena por gravedad: la plantilla rechazada antes que los borradores", async () => {
    const island = within(await screen.findByRole("region", { name: "Lo próximo" }));
    expect(await island.findByText("Algo necesita tu revisión")).toBeInTheDocument();
    const rows = island.getAllByRole("link").map((link) => link.textContent ?? "");
    expect(rows[0]).toContain("plantilla rechazada por Meta");
    expect(rows[0]).toContain("promo_septiembre");
    expect(rows[1]).toContain("borradores sin lanzar");
    expect(island.getByRole("link", { name: "Revisar plantilla" })).toHaveAttribute("href", "/settings/meta-templates");
  });

  it("dice el estado de las plantillas y el cupo de Meta de hoy", () => {
    const tpl = within(screen.getByText("Plantillas de Meta").closest("section")!);
    expect(tpl.getByText("1 rechazada")).toBeInTheDocument();
    const quota = within(screen.getByText("Cupo diario de Meta").closest("section")!);
    expect(quota.getByText("830")).toBeInTheDocument();
    expect(quota.getByText(/Usadas 170 de las 1.000/)).toBeInTheDocument();
  });

  it("el feed en vivo explica que está a la escucha cuando aún no llegó nada", () => {
    expect(screen.getByText("A la escucha")).toBeInTheDocument();
  });
});

describe("«Lo próximo» sin nada pendiente", () => {
  it("dice «Todo en orden» solo cuando leyó todo; sin número Cloud, lo ofrece conectar", async () => {
    automations.listAutomations.mockResolvedValue([rule()]);
    automations.getAutomationMetrics.mockResolvedValue(metrics());
    campaignsReturn([campaign()], 0);
    campaigns.getCampaignStats.mockResolvedValue(stats());
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });
    channels.listChannels.mockResolvedValue({ data: [] });

    render(<MarketingOverviewView />);

    const island = within(await screen.findByRole("region", { name: "Lo próximo" }));
    expect(await island.findByText("Todo en orden")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Conectar WhatsApp/ }).length).toBeGreaterThan(0);
  });
});

describe("resumen sin actividad", () => {
  it("invita a empezar cuando el tenant no tiene nada configurado", async () => {
    automations.listAutomations.mockResolvedValue([]);
    campaignsReturn([], 0);
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });

    render(<MarketingOverviewView />);

    expect(await screen.findByText("Aún no recuperas ventas")).toBeInTheDocument();
    expect(screen.getByText("Crear mi primera regla")).toBeInTheDocument();
  });

  it("un bloque caído lo dice en su sitio, y la isla no da por hecho que todo está en orden", async () => {
    automations.listAutomations.mockRejectedValue(new Error("Se cayó la conexión"));
    campaignsReturn([], 0);
    promotions.listPromotions.mockResolvedValue([]);
    optOuts.listOptOuts.mockResolvedValue({ data: [], meta: { total: 0 } });
    templates.listHsmTemplates.mockResolvedValue([]);

    render(<MarketingOverviewView />);

    expect(await screen.findByText("No pudimos leer lo recuperado.")).toBeInTheDocument();
    const island = within(screen.getByRole("region", { name: "Lo próximo" }));
    expect(island.getByText("No pudimos revisar lo pendiente")).toBeInTheDocument();
    expect(screen.queryByText("Todo en orden")).not.toBeInTheDocument();

    automations.listAutomations.mockResolvedValue([rule()]);
    automations.getAutomationMetrics.mockResolvedValue(metrics());
    fireEvent.click(island.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("en 31 pedidos pagados")).toBeInTheDocument();
  });
});
