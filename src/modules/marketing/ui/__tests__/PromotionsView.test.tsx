import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import { PromotionsView } from "../PromotionsView";

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal, closeModal: jest.fn() }),
}));

jest.mock("@/modules/marketing/infrastructure/services/promotions-service.adapter", () => ({
  listPromotions: jest.fn(),
  updatePromotion: jest.fn(),
  deletePromotion: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/marketing/infrastructure/services/promotions-service.adapter") as {
  listPromotions: jest.Mock;
  updatePromotion: jest.Mock;
  deletePromotion: jest.Mock;
};

function promo(over: Partial<PromotionDTO> = {}): PromotionDTO {
  return {
    id: "p1",
    name: "Vuelve y ahorra",
    kind: "percent_discount",
    percent: 25,
    amount_cents: null,
    gift_variant_id: null,
    shipping_value_cents: null,
    min_order_cents: 5_000_000,
    shared_code: "VUELVE10",
    validity_hours: 6,
    starts_at: "2026-07-01T00:00:00.000Z",
    ends_at: null,
    max_redemptions_total: 50,
    max_redemptions_per_contact: 1,
    redemptions_count: 31,
    coupons_issued: 118,
    redemptions_recorded: 31,
    enabled: true,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...over,
  } as PromotionDTO;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// Explícito además del auto-cleanup de Testing Library: estos tests montan
// la vista completa y un desmontaje tardío deja timers de fetch vivos.
afterEach(cleanup);

describe("PromotionsView", () => {
  it("describe la promoción con su parámetro y formatea el dinero", async () => {
    api.listPromotions.mockResolvedValue([promo()]);
    render(<PromotionsView />);

    expect(await screen.findByText("Vuelve y ahorra")).toBeInTheDocument();
    expect(screen.getByText(/25% de descuento/)).toBeInTheDocument();
    expect(screen.getByText(/Pedido mínimo \$/)).toBeInTheDocument();
    expect(screen.getByText("VUELVE10")).toBeInTheDocument();
    // 118 emitidos − 31 canjeados. Se rotula "sin canjear", NO "vigentes": el
    // DTO no dice cuántos vencieron.
    expect(screen.getByText("Cupones sin canjear")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("oculta las apagadas con el filtro por defecto", async () => {
    api.listPromotions.mockResolvedValue([
      promo(),
      promo({ id: "p2", name: "Apagada", enabled: false }),
    ]);
    render(<PromotionsView />);

    await screen.findByText("Vuelve y ahorra");
    expect(screen.queryByText("Apagada")).not.toBeInTheDocument();
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
  });

  it("busca por nombre y por código compartido", async () => {
    api.listPromotions.mockResolvedValue([
      promo(),
      promo({ id: "p2", name: "Envío gratis", shared_code: null }),
    ]);
    render(<PromotionsView />);
    await screen.findByText("Envío gratis");

    fireEvent.change(screen.getByLabelText("Buscar promoción"), {
      target: { value: "vuelve10" },
    });
    await waitFor(() => expect(screen.queryByText("Envío gratis")).not.toBeInTheDocument());
    expect(screen.getByText("Vuelve y ahorra")).toBeInTheDocument();
  });

  it("distingue el vacío por filtros del vacío real", async () => {
    api.listPromotions.mockResolvedValue([promo()]);
    render(<PromotionsView />);
    await screen.findByText("Vuelve y ahorra");

    fireEvent.change(screen.getByLabelText("Buscar promoción"), { target: { value: "zzz" } });
    expect(await screen.findByText("Ninguna promoción coincide")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
  });

  it("invita a crear la primera cuando no hay ninguna", async () => {
    api.listPromotions.mockResolvedValue([]);
    render(<PromotionsView />);

    expect(await screen.findByText("Aún no tienes promociones")).toBeInTheDocument();
    expect(screen.getByText("Crear mi primera promoción")).toBeInTheDocument();
    // Sin promociones no tiene sentido ofrecer filtros.
    expect(screen.queryByLabelText("Filtrar por estado")).not.toBeInTheDocument();
  });

  it("informa del fallo con reintento", async () => {
    // `errorMessage` devuelve el mensaje del Error cuando no es un HttpError;
    // el fallback solo entra si el error no trae mensaje.
    api.listPromotions.mockRejectedValue(new Error("El servidor no respondió"));
    render(<PromotionsView />);

    expect(await screen.findByText("El servidor no respondió")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("apagar una promoción pide confirmación antes de tocar nada", async () => {
    api.listPromotions.mockResolvedValue([promo()]);
    render(<PromotionsView />);
    await screen.findByText("Vuelve y ahorra");

    fireEvent.click(screen.getByLabelText("Más acciones de Vuelve y ahorra"));
    fireEvent.click(await screen.findByText("Apagar promoción"));

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: "¿Apagar «Vuelve y ahorra»?" }),
    );
    expect(api.updatePromotion).not.toHaveBeenCalled();
  });

  it("eliminar avisa de que los canjes se conservan", async () => {
    api.listPromotions.mockResolvedValue([promo()]);
    render(<PromotionsView />);
    await screen.findByText("Vuelve y ahorra");

    fireEvent.click(screen.getByLabelText("Más acciones de Vuelve y ahorra"));
    fireEvent.click(await screen.findByText("Eliminar"));

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("canjes ya registrados se conservan"),
      }),
    );
    expect(api.deletePromotion).not.toHaveBeenCalled();
  });

  it("una promoción sin tope no pinta barra de progreso", async () => {
    api.listPromotions.mockResolvedValue([promo({ max_redemptions_total: null })]);
    render(<PromotionsView />);

    expect(await screen.findByText("Sin tope de canjes")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("pone primero lo que está dando algo ahora", async () => {
    api.listPromotions.mockResolvedValue([
      promo({ id: "p1", name: "Programada", starts_at: "2099-01-01T00:00:00.000Z" }),
      promo({ id: "p2", name: "En curso" }),
    ]);
    render(<PromotionsView />);

    await screen.findByText("En curso");
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["En curso", "Programada"]);
  });
});
