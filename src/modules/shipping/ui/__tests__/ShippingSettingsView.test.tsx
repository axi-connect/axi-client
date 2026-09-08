import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ShippingSettingsDTO, ShippingZoneDTO } from "@/modules/shipping/domain/shipping";

const mockZones = jest.fn();
const mockSettings = jest.fn();
const mockDeleteZone = jest.fn();
jest.mock("@/modules/shipping/infrastructure/services/shipping-service.adapter", () => ({
  listShippingZones: () => mockZones(),
  getShippingSettings: () => mockSettings(),
  deleteShippingZone: (...args: unknown[]) => mockDeleteZone(...args),
  deleteShippingRate: jest.fn(),
  updateShippingSettings: jest.fn(),
  createShippingZone: jest.fn(),
  updateShippingZone: jest.fn(),
  createShippingRate: jest.fn(),
  updateShippingRate: jest.fn(),
  listCoProvinces: () => Promise.resolve([]),
}));

let mockCanManage = true;
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => mockCanManage }),
}));

const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal, closeModal: jest.fn() }),
}));

/* Los sheets se prueban aparte; aquí solo importa que se abran con los valores correctos. */
jest.mock("@/modules/shipping/ui/components/ZoneFormSheet", () => ({
  ZoneFormSheet: ({ zone }: { zone: { name: string } | null }) => (
    <div data-testid="zone-sheet">{zone === null ? "nueva zona" : `editando ${zone.name}`}</div>
  ),
}));
jest.mock("@/modules/shipping/ui/components/RateFormSheet", () => ({
  RateFormSheet: ({ zone }: { zone: { name: string } }) => <div data-testid="rate-sheet">tarifa en {zone.name}</div>,
}));

/* eslint-disable @typescript-eslint/no-require-imports -- los mocks de arriba
   exigen require() tras jest.mock (import estático se izaría antes del mock) */
const { ShippingSettingsView } = require("../ShippingSettingsView") as typeof import("../ShippingSettingsView");
/* eslint-enable @typescript-eslint/no-require-imports */

const settings = (over: Partial<ShippingSettingsDTO> = {}): ShippingSettingsDTO => ({
  ai_enabled: false,
  rate_selection: "cheapest",
  require_address_before_confirm: true,
  governed_by: null,
  ...over,
});

const zone = (over: Partial<ShippingZoneDTO> = {}): ShippingZoneDTO => ({
  id: "z1",
  name: "Bogotá y alrededores",
  country_code: "CO",
  province_codes: ["CO-DC", "CO-CUN"],
  provinces: [
    { code: "CO-DC", name: "Bogotá D.C." },
    { code: "CO-CUN", name: "Cundinamarca" },
  ],
  position: 0,
  is_active: true,
  governed_by_connection_id: null,
  rates: [
    {
      id: "r1",
      name: "Domicilio en Bogotá",
      kind: "flat",
      price_cents: 800_000,
      min_order_cents: null,
      max_order_cents: 14_999_900,
      position: 0,
      is_active: true,
      governed_by_connection_id: null,
    },
    {
      id: "r2",
      name: "Domicilio en Bogotá",
      kind: "flat",
      price_cents: 0,
      min_order_cents: 15_000_000,
      max_order_cents: null,
      position: 1,
      is_active: true,
      governed_by_connection_id: null,
    },
  ],
  created_at: "2026-09-07T00:00:00.000Z",
  updated_at: "2026-09-07T00:00:00.000Z",
  ...over,
});

/**
 * `/settings/shipping`: lo que la IA usa para cotizar. Bajo gobierno del
 * proveedor no hay lápices ni «Nueva zona» (se edita en la tienda); eliminar
 * siempre pide confirmación con `keepOpen` (regla del 7-sep).
 */
describe("ShippingSettingsView", () => {
  beforeEach(() => {
    mockCanManage = true;
    mockZones.mockReset();
    mockSettings.mockReset();
    showModal.mockReset();
    mockSettings.mockResolvedValue(settings());
  });

  it("lista zonas con departamentos, condición y precio («Gratis» a 0), y abre los sheets", async () => {
    mockZones.mockResolvedValue([zone()]);
    render(<ShippingSettingsView />);
    await screen.findByText("Bogotá y alrededores");

    expect(screen.getByText("Cundinamarca")).toBeInTheDocument();
    expect(screen.getByText(/Pedidos hasta \$\s?149\.999/)).toBeInTheDocument();
    expect(screen.getByText(/Pedidos desde \$\s?150\.000/)).toBeInTheDocument();
    expect(screen.getByText("Gratis")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nueva zona" }));
    expect(screen.getByTestId("zone-sheet")).toHaveTextContent("nueva zona");

    fireEvent.click(screen.getByRole("button", { name: "Agregar tarifa" }));
    expect(screen.getByTestId("rate-sheet")).toHaveTextContent("tarifa en Bogotá y alrededores");
  });

  it("eliminar una zona pide confirmación y la acción destructiva NO cierra sola el diálogo", async () => {
    mockZones.mockResolvedValue([zone()]);
    render(<ShippingSettingsView />);
    await screen.findByText("Bogotá y alrededores");

    fireEvent.click(screen.getByRole("button", { name: "Eliminar zona Bogotá y alrededores" }));
    expect(showModal).toHaveBeenCalledTimes(1);
    const config = showModal.mock.calls[0][0] as {
      actions: { label: string; keepOpen?: boolean }[];
    };
    const destructive = config.actions.find((action) => action.label === "Eliminar");
    expect(destructive?.keepOpen).toBe(true);
    expect(mockDeleteZone).not.toHaveBeenCalled();
  });

  it("bajo gobierno de la tienda: badge, solo lectura y enlace a la integración", async () => {
    mockSettings.mockResolvedValue(settings({ governed_by: "shopify" }));
    mockZones.mockResolvedValue([zone({ governed_by_connection_id: "int-1" })]);
    render(<ShippingSettingsView />);
    await screen.findByText("Bogotá y alrededores");

    expect(screen.getByText(/Gobernado por/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la integración" })).toHaveAttribute("href", "/settings/integrations");
    expect(screen.queryByRole("button", { name: "Nueva zona" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar zona/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar tarifa" })).not.toBeInTheDocument();
    // La política de cotización sí se edita: es de axi, no de la tienda.
    expect(screen.getByLabelText("Cotizar envíos por chat")).toBeInTheDocument();
  });

  it("sin zonas invita a crear la primera y avisa de que la IA no puede cotizar", async () => {
    mockZones.mockResolvedValue([]);
    render(<ShippingSettingsView />);
    expect(await screen.findByText("Aún no hay zonas de envío")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear la primera zona" })).toBeInTheDocument();
    expect(screen.getByText(/sin zonas la IA no tiene qué cotizar/)).toBeInTheDocument();
  });

  it("informa del fallo de carga y el reintento vuelve a pedir", async () => {
    mockZones.mockRejectedValue(new Error("Se cayó la conexión"));
    render(<ShippingSettingsView />);
    expect(await screen.findByText("Se cayó la conexión")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(mockZones).toHaveBeenCalledTimes(2));
  });
});
