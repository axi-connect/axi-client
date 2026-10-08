import { render, screen } from "@testing-library/react";

import type { GovernedField, ProductDTO } from "@/modules/catalog/domain/product";
import { ProductBaseSection } from "../ProductBaseSection";

jest.mock("@/modules/catalog/infrastructure/stores/catalog.context", () => ({
  useCatalog: () => ({ productTypes: [], categoryTree: [] }),
}));
jest.mock("@/modules/catalog/infrastructure/services/product-service.adapter", () => ({
  updateProduct: jest.fn(),
  confirmProductCategory: jest.fn(),
  setProductCategory: jest.fn(),
}));

const product = {
  id: "p1",
  kind: "product",
  name: "Protector solar FPS 50",
  description: "Toque seco",

  product_type_id: null,
  price_cents: 7_200_000,
  currency: "COP",
  duration_minutes: null,
  buffer_minutes: null,
  requires_booking: false,
  effective_category: { id: "c1", name: "Protección solar", source: "llm", confidence: 0.9, is_automatic: true },
} as unknown as ProductDTO;

const LOCKED = new Set<GovernedField>(["name", "description", "price", "status", "category", "variants", "stock", "images"]);

describe("Información en un producto de la tienda (catálogo premium F5)", () => {
  it("cada campo que manda Shopify lo dice; la ficha no se guarda, la categoría sí se fija", () => {
    render(<ProductBaseSection product={product} canManage onSaved={jest.fn()} locked={LOCKED} />);
    expect(screen.getAllByText("Lo manda Shopify")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    expect(screen.getByText(/Aquí puedes fijar su categoría/)).toBeInTheDocument();
    // La categoría efectiva queda FUERA del bloqueo: el servidor la acepta en un espejo
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("un producto propio: sin avisos de la tienda y con «Guardar cambios»", () => {
    render(<ProductBaseSection product={product} canManage onSaved={jest.fn()} />);
    expect(screen.queryByText("Lo manda Shopify")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeEnabled();
  });
});
