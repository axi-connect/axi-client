import { render, screen, within } from "@testing-library/react";

import type { ProductRow } from "@/modules/catalog/domain/product";
import { ProductsTable } from "../ProductsTable";
import { ProductGrid } from "@/modules/catalog/ui/components/ProductGrid";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));

const row = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  id: "p1",
  name: "Sérum de vitamina C al 15 %",
  kind: "product",
  thumb_url: null,
  category_id: "c1",
  category_name: "Sérums",
  category_is_automatic: true,
  category_note: "automática · 92 % · por IA",
  category_missing: false,
  price_cents: 8_900_000,
  currency: "COP",
  price_label: "$ 89.000",
  price_range_label: "$ 89.000 – $ 129.000",
  sku: "SER-VC",
  variant_count: 2,
  unavailable_variant_count: 0,
  image_count: 4,
  stock_total: 24,
  stock_state: "ok",
  duration_minutes: null,
  requires_booking: false,
  is_active: true,
  governed: false,
  created_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

describe("listado de productos: tabla y tarjetas dicen lo mismo (catálogo premium F2)", () => {
  const rows = [
    row(),
    row({
      id: "p2",
      name: "Protector solar FPS 50",
      governed: true,
      sku: "SOL-50",
      variant_count: 1,
      stock_total: 0,
      stock_state: "out",
      image_count: 0,
      category_is_automatic: false,
      category_note: "",
      price_range_label: "$ 72.000",
    }),
    row({
      id: "p3",
      name: "Limpieza facial profunda",
      kind: "service",
      duration_minutes: 60,
      requires_booking: true,
      stock_state: "none",
      stock_total: null,
      is_active: false,
    }),
  ];

  it("la tabla: SKU y variantes, categoría con su procedencia, rango de precio, stock y estado", () => {
    render(<ProductsTable rows={rows} busy={false} />);
    const first = screen.getByRole("link", { name: /Sérum de vitamina C/ });
    expect(first).toHaveAttribute("href", "/catalog/products/p1");
    expect(within(first).getByText("SER-VC")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Categoría automática" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("automática · 92 % · por IA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$ 89.000 – $ 129.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shopify").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Servicio · 60 min · requiere reserva").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/· agotado$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sin fotos: tu agente no podrá mostrar este producto/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Acciones de Protector solar FPS 50" })).toBeInTheDocument();
  });

  it("recargando con filas: se atenúa y se anuncia ocupada, sin volver a la silueta", () => {
    const { container } = render(<ProductsTable rows={rows} busy />);
    expect(container.querySelector("tbody")).toHaveAttribute("aria-busy", "true");
  });

  it("las tarjetas: los mismos datos (stock, Shopify, servicio, inactivo) y «Subir fotos» sin fotos", () => {
    render(<ProductGrid rows={rows} canManage />);
    expect(screen.getByRole("link", { name: "Ver Protector solar FPS 50" })).toHaveAttribute("href", "/catalog/products/p2");
    expect(screen.getAllByText("Shopify").length).toBe(1);
    expect(screen.getByText("Servicio")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.getAllByText(/· agotado$/).length).toBe(1);
    expect(screen.getAllByText("24").length).toBeGreaterThan(0);
    // Sin fotos y sin imagen por URL: la tarjeta lo dice y ofrece subirlas
    const upload = screen.getAllByRole("link", { name: "Subir fotos" });
    expect(upload[0]).toHaveAttribute("href", expect.stringMatching(/\/catalog\/products\/p\d#fotos$/));
  });
});
