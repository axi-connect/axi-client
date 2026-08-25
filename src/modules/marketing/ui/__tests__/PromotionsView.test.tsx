import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import { PromotionsView } from "../PromotionsView";

/**
 * Estos tests se agrupan POR ESCENARIO, no por aserción.
 *
 * Montar la vista cuesta ~1 s (jsdom + el árbol completo) mientras que una
 * aserción cuesta microsegundos: un `it` por comprobación multiplica el coste
 * sin añadir cobertura. Cada bloque monta UNA vez con un fixture que cubre
 * varios casos a la vez, y encima resulta más realista — la lista de verdad
 * mezcla promociones vivas, apagadas y vencidas.
 *
 * Lo que NO se agrupa: los escenarios que necesitan otro estado inicial
 * (catálogo vacío, error de carga). Ahí el montaje aparte es la única forma de
 * llegar al estado que se quiere comprobar.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

/* El enlace profundo desde el chat de Axel (`?promotion=<id>`) lee el router de
   App Router, que en jsdom no está montado. `mockParams` es mutable a propósito:
   así un escenario puede llegar «desde el chat» y el resto no. */
let mockParams = new URLSearchParams();
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/marketing/promotions",
  useSearchParams: () => mockParams,
}));

const showModal = jest.fn();
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
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
    gift_variant: null,
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

beforeEach(() => jest.clearAllMocks());
afterEach(cleanup);

describe("catálogo con promociones", () => {
  /** Mezcla realista: viva con tope y código, viva sin tope, apagada y vencida. */
  const CATALOGO = [
    promo({
      id: "p2",
      name: "Envío gratis",
      kind: "free_shipping",
      percent: null,
      shipping_value_cents: 1_200_000,
      shared_code: null,
      max_redemptions_total: null,
      redemptions_count: 2,
      coupons_issued: 2,
      redemptions_recorded: 2,
      created_at: "2026-06-01T00:00:00.000Z",
    }),
    promo({ created_at: "2026-07-20T00:00:00.000Z" }),
    promo({ id: "p3", name: "Promo apagada", enabled: false }),
    promo({ id: "p4", name: "Regalo de julio", ends_at: "2026-07-31T00:00:00.000Z" }),
  ];

  beforeEach(async () => {
    api.listPromotions.mockResolvedValue(CATALOGO);
    render(<PromotionsView />);
    await screen.findByText("Vuelve y ahorra");
  });

  it("describe cada promoción con su parámetro, su código y sus cupones", () => {
    expect(screen.getByText(/25% de descuento/)).toBeInTheDocument();
    expect(screen.getByText(/Envío gratis · descuenta \$/)).toBeInTheDocument();
    expect(screen.getAllByText(/Pedido mínimo \$/).length).toBeGreaterThan(0);
    expect(screen.getByText("VUELVE10")).toBeInTheDocument();
    // 118 emitidos − 31 canjeados. Se rotula "sin canjear", NO "vigentes": el
    // DTO no dice cuántos vencieron.
    expect(screen.getAllByText("Cupones sin canjear").length).toBeGreaterThan(0);
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("el filtro por defecto deja fuera lo apagado y lo vencido, y lo dice", () => {
    expect(screen.queryByText("Promo apagada")).not.toBeInTheDocument();
    expect(screen.queryByText("Regalo de julio")).not.toBeInTheDocument();
    expect(screen.getByText("2 de 4")).toBeInTheDocument();
  });

  it("pone primero lo que está dando algo ahora y no pinta barras sin tope", () => {
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["Vuelve y ahorra", "Envío gratis"]);
    expect(screen.getByText("Sin tope de canjes")).toBeInTheDocument();
    // La única barra es la de la promoción que sí tiene tope.
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });

  it("busca por nombre y por código, y distingue el vacío por filtros del real", () => {
    const search = screen.getByLabelText("Buscar promoción");

    fireEvent.change(search, { target: { value: "vuelve10" } });
    expect(screen.queryByText("Envío gratis")).not.toBeInTheDocument();
    expect(screen.getByText("Vuelve y ahorra")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText("Ninguna promoción coincide")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    // Limpiar quita TODOS los filtros, así que reaparecen incluso las apagadas.
    expect(screen.getByText("Promo apagada")).toBeInTheDocument();
  });

  it("apagar y eliminar piden confirmación antes de tocar nada", () => {
    const menuButton = screen.getByLabelText("Más acciones de Vuelve y ahorra");
    fireEvent.click(menuButton);
    const menu = menuButton.parentElement!;

    fireEvent.click(within(menu).getByText("Apagar promoción"));
    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: "¿Apagar «Vuelve y ahorra»?" }),
    );
    expect(api.updatePromotion).not.toHaveBeenCalled();

    fireEvent.click(within(menu).getByText("Eliminar"));
    expect(showModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("canjes ya registrados se conservan"),
      }),
    );
    expect(api.deletePromotion).not.toHaveBeenCalled();
  });
});

/* El destino de «Ver la promoción» en el chat de Axel. Lo que Axel deja nace
   APAGADO, así que el escenario usa justamente la promoción apagada: si el foco
   no forzara el filtro a «todas», el dueño cerraría el panel y no vería su fila. */
describe("llegando desde el chat de Axel", () => {
  afterEach(() => {
    mockParams = new URLSearchParams();
  });

  it("abre el borrador que trae el enlace y deja de filtrarlo por estado", async () => {
    mockParams = new URLSearchParams("promotion=p3");
    api.listPromotions.mockResolvedValue([
      promo({ id: "p3", name: "Promo apagada", enabled: false }),
      promo({ name: "Vuelve y ahorra" }),
    ]);
    render(<PromotionsView />);

    expect(await screen.findByText("Editar promoción")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Promo apagada")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por estado")).toHaveTextContent("Todas");
  });

  it("dice que ya no está en vez de abrir un panel vacío", async () => {
    mockParams = new URLSearchParams("promotion=borrada");
    api.listPromotions.mockResolvedValue([promo({ name: "Vuelve y ahorra" })]);
    render(<PromotionsView />);

    await screen.findByText("Vuelve y ahorra");
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Esa promoción ya no está" }),
    );
    expect(screen.queryByText("Editar promoción")).not.toBeInTheDocument();
  });
});

describe("estados sin datos", () => {
  it("invita a crear la primera y no ofrece filtros que no filtrarían nada", async () => {
    api.listPromotions.mockResolvedValue([]);
    render(<PromotionsView />);

    expect(await screen.findByText("Aún no tienes promociones")).toBeInTheDocument();
    expect(screen.getByText("Crear mi primera promoción")).toBeInTheDocument();
    expect(screen.queryByLabelText("Filtrar por estado")).not.toBeInTheDocument();
  });

  it("informa del fallo de carga y el reintento vuelve a pedir", async () => {
    api.listPromotions.mockRejectedValue(new Error("Se cayó la conexión"));
    render(<PromotionsView />);

    expect(await screen.findByText("Se cayó la conexión")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(api.listPromotions).toHaveBeenCalledTimes(2));
  });
});
