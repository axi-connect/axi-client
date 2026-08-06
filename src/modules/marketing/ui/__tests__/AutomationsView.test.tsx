import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  AutomationDTO,
  AutomationMetricsDTO,
} from "@/modules/marketing/domain/automation";
import { AutomationsView } from "../AutomationsView";

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showModal = jest.fn();
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
}));

jest.mock("@/modules/marketing/infrastructure/services/automations-service.adapter", () => ({
  listAutomations: jest.fn(),
  getAutomationMetrics: jest.fn(),
  updateAutomation: jest.fn(),
  deleteAutomation: jest.fn(),
  createAutomation: jest.fn(),
}));
jest.mock("@/modules/marketing/infrastructure/services/promotions-service.adapter", () => ({
  listPromotions: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/marketing/infrastructure/services/automations-service.adapter") as {
  listAutomations: jest.Mock;
  getAutomationMetrics: jest.Mock;
  updateAutomation: jest.Mock;
  deleteAutomation: jest.Mock;
};
const promoApi = require("@/modules/marketing/infrastructure/services/promotions-service.adapter") as {
  listPromotions: jest.Mock;
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
    message_template: "Hola {{first_name}}",
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
    skipped_by_reason: { opted_out: 8, human_active: 4, no_channel: 2 },
    converted: 31,
    conversion_rate: 0.242,
    attributed_revenue_cents: 394_000_000,
    coupons_issued: 118,
    coupons_redeemed: 31,
    ...over,
  } as AutomationMetricsDTO;
}

beforeEach(() => {
  jest.clearAllMocks();
  promoApi.listPromotions.mockResolvedValue([]);
});

afterEach(cleanup);

describe("AutomationsView", () => {
  it("muestra las métricas con el dinero formateado y el desglose de omitidos", async () => {
    api.listAutomations.mockResolvedValue([rule()]);
    api.getAutomationMetrics.mockResolvedValue(metrics());
    render(<AutomationsView />);

    expect(await screen.findByText("Carrito con cupón")).toBeInTheDocument();
    expect(await screen.findByText("$ 3.940.000")).toBeInTheDocument();
    // El "por qué" de los omitidos, no solo el número: si no, parece una avería.
    expect(
      await screen.findByText(/8 el contacto pidió no recibir promociones/i),
    ).toBeInTheDocument();
  });

  it("ordena por prioridad, que es el orden en que el backend las evalúa", async () => {
    api.listAutomations.mockResolvedValue([
      rule({ id: "a2", name: "Segunda", priority: 5 }),
      rule({ id: "a1", name: "Primera", priority: 1 }),
    ]);
    api.getAutomationMetrics.mockResolvedValue(metrics({ sent: 0, skipped: 0 }));
    render(<AutomationsView />);

    await screen.findByText("Primera");
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["Primera", "Segunda"]);
  });

  it("agrupa por disparador y avisa de los que no tienen reglas", async () => {
    api.listAutomations.mockResolvedValue([rule()]);
    api.getAutomationMetrics.mockResolvedValue(metrics());
    render(<AutomationsView />);

    await screen.findByText("Carrito con cupón");
    expect(screen.getByText("Conversación inactiva")).toBeInTheDocument();
    expect(
      screen.getAllByText("Nadie está recuperando estas ventas todavía.").length,
    ).toBe(2);
  });

  it("encender pide confirmación que dice exactamente qué va a pasar", async () => {
    api.listAutomations.mockResolvedValue([rule({ enabled: false })]);
    api.getAutomationMetrics.mockResolvedValue(metrics({ sent: 0, skipped: 0 }));
    render(<AutomationsView />);

    fireEvent.click(await screen.findByRole("switch", { name: "Regla Carrito con cupón" }));

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "¿Encender «Carrito con cupón»?",
        description: expect.stringContaining("15 minutos"),
      }),
    );
    expect(api.updateAutomation).not.toHaveBeenCalled();
  });

  it("bloquea encender deal_stalled sin plantilla de Meta y explica por qué", async () => {
    api.listAutomations.mockResolvedValue([
      rule({ trigger_type: "deal_stalled", enabled: false, delay_minutes: 4320 }),
    ]);
    api.getAutomationMetrics.mockResolvedValue(metrics({ sent: 0, skipped: 0 }));
    render(<AutomationsView />);

    expect(await screen.findByText(/plantilla aprobada por Meta/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Regla Carrito con cupón" })).toBeDisabled();
  });

  it("avisa cuando todas las reglas están apagadas", async () => {
    api.listAutomations.mockResolvedValue([rule({ enabled: false })]);
    api.getAutomationMetrics.mockResolvedValue(metrics({ sent: 0, skipped: 0 }));
    render(<AutomationsView />);

    expect(
      await screen.findByText("Ninguna de tus reglas está encendida."),
    ).toBeInTheDocument();
  });

  it("una regla sin disparos lo dice en vez de enseñar ceros", async () => {
    api.listAutomations.mockResolvedValue([rule()]);
    api.getAutomationMetrics.mockResolvedValue(metrics({ sent: 0, skipped: 0 }));
    render(<AutomationsView />);

    expect(await screen.findByText("Nunca se ha disparado.")).toBeInTheDocument();
    expect(screen.queryByText("Enviados")).not.toBeInTheDocument();
  });

  it("un fallo de métricas de una regla no tumba la lista", async () => {
    api.listAutomations.mockResolvedValue([rule(), rule({ id: "a2", name: "Otra" })]);
    api.getAutomationMetrics
      .mockResolvedValueOnce(metrics())
      .mockRejectedValueOnce(new Error("boom"));
    render(<AutomationsView />);

    expect(await screen.findByText("Carrito con cupón")).toBeInTheDocument();
    expect(screen.getByText("Otra")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Sus cifras no cargaron.")).toBeInTheDocument());
  });

  it("invita a crear la primera regla cuando no hay ninguna", async () => {
    api.listAutomations.mockResolvedValue([]);
    render(<AutomationsView />);

    expect(await screen.findByText("Aún no recuperas ventas")).toBeInTheDocument();
    expect(screen.getByText("Crear mi primera regla")).toBeInTheDocument();
  });

  it("informa del fallo de carga con reintento", async () => {
    api.listAutomations.mockRejectedValue(new Error("Se cayó la conexión"));
    render(<AutomationsView />);

    expect(await screen.findByText("Se cayó la conexión")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("solo ofrece promociones vivas en el editor", async () => {
    api.listAutomations.mockResolvedValue([rule()]);
    api.getAutomationMetrics.mockResolvedValue(metrics());
    promoApi.listPromotions.mockResolvedValue([
      {
        id: "p1",
        name: "Viva",
        enabled: true,
        starts_at: "2020-01-01T00:00:00.000Z",
        ends_at: null,
        max_redemptions_total: null,
        redemptions_count: 0,
      },
      {
        id: "p2",
        name: "Apagada",
        enabled: false,
        starts_at: "2020-01-01T00:00:00.000Z",
        ends_at: null,
        max_redemptions_total: null,
        redemptions_count: 0,
      },
    ]);
    render(<AutomationsView />);

    fireEvent.click(await screen.findByRole("button", { name: /Editar/ }));

    expect(await screen.findByRole("option", { name: "Viva" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Apagada" })).not.toBeInTheDocument();
  });
});
