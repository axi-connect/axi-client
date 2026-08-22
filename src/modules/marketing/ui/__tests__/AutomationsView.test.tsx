import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  AutomationDTO,
  AutomationMetricsDTO,
} from "@/modules/marketing/domain/automation";
import { AutomationsView } from "../AutomationsView";

/**
 * Agrupados POR ESCENARIO (ver la nota de `PromotionsView.test.tsx`): montar
 * la vista cuesta ~1 s y una aserción no cuesta nada.
 *
 * El fixture principal es una MEZCLA deliberada — activa con métricas, apagada
 * que nunca se disparó, activa cuyos omitidos son todos transitorios, y una
 * `deal_stalled` bloqueada por falta de plantilla — porque así es como se ve la
 * pantalla de verdad y porque un solo montaje cubre los seis comportamientos.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal, closeModal: jest.fn() }),
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

/** Regla que nunca se disparó: TODO a cero, no solo los envíos. */
const SIN_DISPAROS = metrics({
  sent: 0,
  skipped: 0,
  skipped_by_reason: {},
  converted: 0,
  conversion_rate: 0,
  attributed_revenue_cents: 0,
  coupons_issued: 0,
  coupons_redeemed: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  promoApi.listPromotions.mockResolvedValue([]);
});

afterEach(cleanup);

describe("reglas con actividad", () => {
  const REGLAS = [
    rule({ id: "a2", name: "Segunda del carrito", priority: 5, enabled: false }),
    rule({ id: "a1", name: "Carrito con cupón", priority: 1 }),
    rule({ id: "a3", name: "Prueba social", trigger_type: "conversation_inactive" }),
    rule({
      id: "a4",
      name: "Rescate de negociación",
      trigger_type: "deal_stalled",
      delay_minutes: 4320,
      enabled: false,
    }),
    rule({ id: "a5", name: "Sin cifras", trigger_type: "conversation_inactive", priority: 9 }),
  ];

  beforeEach(async () => {
    api.listAutomations.mockResolvedValue(REGLAS);
    api.getAutomationMetrics.mockImplementation((id: string) => {
      if (id === "a1") return Promise.resolve(metrics());
      // Omitidos SOLO transitorios: no son contactos perdidos.
      if (id === "a3") {
        return Promise.resolve(
          metrics({
            sent: 74,
            skipped: 3,
            skipped_by_reason: { cooldown: 3 },
            // Cifras propias: si comparte el importe con otra regla, la
            // aserción del dinero deja de identificar a cuál pertenece.
            converted: 4,
            attributed_revenue_cents: 58_000_000,
            coupons_issued: 0,
            coupons_redeemed: 0,
          }),
        );
      }
      if (id === "a5") return Promise.reject(new Error("boom"));
      return Promise.resolve(SIN_DISPAROS);
    });
    render(<AutomationsView />);
    await screen.findByText("Carrito con cupón");
  });

  it("muestra las métricas con el dinero formateado y el porqué de los omitidos", async () => {
    expect(await screen.findByText("$ 3.940.000")).toBeInTheDocument();
    // El "por qué", no solo el número: si no, parece una avería.
    expect(
      await screen.findByText(/8 el contacto pidió no recibir promociones/i),
    ).toBeInTheDocument();
  });

  it("distingue nunca-disparada, omitidos transitorios y métricas caídas", async () => {
    // Dos reglas del fixture nunca se dispararon (la #2 del carrito y la de deal).
    expect(await screen.findAllByText("Nunca se ha disparado.")).toHaveLength(2);
    expect(
      await screen.findByText(/Los 3 omitidos fueron por los límites anti-spam/),
    ).toBeInTheDocument();
    // Una regla cuyas cifras fallan no tumba la lista ni finge ceros.
    expect(await screen.findByText("Sus cifras no cargaron.")).toBeInTheDocument();
  });

  it("agrupa por disparador, ordena por prioridad y señala los grupos vacíos", () => {
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    // Prioridad ascendente dentro de cada grupo = orden de evaluación del backend.
    expect(names).toEqual([
      "Carrito con cupón",
      "Segunda del carrito",
      "Prueba social",
      "Sin cifras",
      "Rescate de negociación",
    ]);
    expect(screen.getByText("Conversación inactiva")).toBeInTheDocument();
    expect(screen.queryByText("Nadie está recuperando estas ventas todavía.")).toBeNull();
  });

  it("encender pide confirmación diciendo exactamente qué va a pasar", () => {
    fireEvent.click(screen.getByRole("switch", { name: "Regla Segunda del carrito" }));

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "¿Encender «Segunda del carrito»?",
        description: expect.stringContaining("15 minutos"),
      }),
    );
    expect(api.updateAutomation).not.toHaveBeenCalled();
  });

  it("el menú de acciones deja llegar a eliminar y pide confirmación", () => {
    // El menú era un `<details>` dentro de una tarjeta `overflow-hidden`: se
    // abría y el panel quedaba recortado entero, así que "Eliminar regla"
    // existía en el DOM pero no había forma de verlo ni de pulsarlo. Esto fija
    // que el ítem NO esté montado con el menú cerrado y que al abrirlo lleve al
    // mismo modal de confirmación.
    expect(screen.queryByRole("menuitem", { name: /Eliminar regla/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Más acciones de Carrito con cupón" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Eliminar regla/ }));

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: "¿Eliminar «Carrito con cupón»?" }),
    );
    expect(api.deleteAutomation).not.toHaveBeenCalled();
  });

  it("bloquea deal_stalled sin plantilla de Meta y explica por qué antes del clic", () => {
    expect(screen.getByText(/plantilla aprobada por Meta/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Regla Rescate de negociación" })).toBeDisabled();
  });
});

describe("otros estados de la lista", () => {
  it("avisa cuando ninguna regla está encendida", async () => {
    api.listAutomations.mockResolvedValue([rule({ enabled: false })]);
    api.getAutomationMetrics.mockResolvedValue(SIN_DISPAROS);
    render(<AutomationsView />);

    expect(await screen.findByText("Ninguna de tus reglas está encendida.")).toBeInTheDocument();
  });

  it("invita a crear la primera cuando no hay ninguna", async () => {
    api.listAutomations.mockResolvedValue([]);
    render(<AutomationsView />);

    expect(await screen.findByText("Aún no recuperas ventas")).toBeInTheDocument();
    expect(screen.getByText("Crear mi primera regla")).toBeInTheDocument();
  });

  it("informa del fallo de carga y el reintento vuelve a pedir", async () => {
    api.listAutomations.mockRejectedValue(new Error("Se cayó la conexión"));
    render(<AutomationsView />);

    expect(await screen.findByText("Se cayó la conexión")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(api.listAutomations).toHaveBeenCalledTimes(2));
  });

  it("el editor solo ofrece promociones vivas", async () => {
    api.listAutomations.mockResolvedValue([rule()]);
    api.getAutomationMetrics.mockResolvedValue(SIN_DISPAROS);
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
        name: "Vencida",
        enabled: true,
        starts_at: "2020-01-01T00:00:00.000Z",
        ends_at: "2020-02-01T00:00:00.000Z",
        max_redemptions_total: null,
        redemptions_count: 0,
      },
    ]);
    render(<AutomationsView />);

    fireEvent.click(await screen.findByRole("button", { name: /Editar/ }));

    // Asignar una vencida crearía una regla que se salta sola con
    // `promotion_inactive` en cuanto se dispare.
    expect(await screen.findByRole("option", { name: "Viva" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Vencida" })).not.toBeInTheDocument();
  });
});
