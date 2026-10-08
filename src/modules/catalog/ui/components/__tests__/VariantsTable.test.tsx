import { render, screen } from "@testing-library/react";

import type { ProductDTO } from "@/modules/catalog/domain/product";
import type { ProductTypeAttributeDTO } from "@/modules/catalog/domain/product-type";
import { VariantsTable } from "@/modules/catalog/ui/components/VariantsTable";

jest.mock("@/modules/catalog/infrastructure/services/product-service.adapter", () => ({
  deleteVariant: jest.fn(),
  createVariant: jest.fn(),
  updateVariant: jest.fn(),
}));

// «Lotes Tribunas» de Enblanco: sin tipo, con su única variante LOTE-001 (clave vacía)
const product = (productTypeId: string | null): ProductDTO =>
  ({
    id: "lotes-tribunas",
    kind: "product",
    currency: "COP",
    product_type_id: productTypeId,
    variants: [
      {
        id: "v1",
        sku: "LOTE-001",
        name: null,
        attributes: {},
        price_cents: 30_400_000_000,
        service_date: null,
        is_default: true,
        is_active: true,
        position: 10,
        stock: null,
      },
    ],
  }) as unknown as ProductDTO;

const AREA = {
  code: "area",
  label: "Área",
  type: "number",
  unit: "m²",
  scope: "variant",
  is_required: false,
} as unknown as ProductTypeAttributeDTO;

function renderTable(props: Partial<Parameters<typeof VariantsTable>[0]> & { product: ProductDTO }) {
  return render(
    <VariantsTable
      axes={[]}
      canManage
      canAdjustStock={false}
      onRefetch={jest.fn(async () => undefined)}
      onStockAdjusted={jest.fn()}
      {...props}
    />,
  );
}

describe("VariantsTable — producto sin ejes de variante (incidente 2026-10-08)", () => {
  it("sin tipo: no ofrece «Añadir variante» y explica cómo tener más, con los dos caminos", () => {
    renderTable({ product: product(null) });

    expect(screen.queryByRole("button", { name: /añadir variante/i })).toBeNull();
    expect(screen.getByText(/necesita un tipo con ejes de variante/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Asignar tipo" })).toHaveAttribute("href", "#informacion");
    expect(screen.getByRole("link", { name: "Crear tipo de producto" })).toHaveAttribute(
      "href",
      "/catalog/product-types/create",
    );
  });

  it("tipo sin ejes de variante: el aviso nombra el tipo y lleva a editarlo", () => {
    renderTable({ product: product("tipo-lote"), productType: { id: "tipo-lote", name: "Lote" } });

    expect(screen.queryByRole("button", { name: /añadir variante/i })).toBeNull();
    expect(screen.getByText(/el tipo «Lote» no tiene ejes de variante/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar el tipo" })).toHaveAttribute(
      "href",
      "/catalog/product-types/tipo-lote",
    );
  });

  it("con ejes: el botón está y no hay aviso", () => {
    renderTable({
      product: product("tipo-lote"),
      productType: { id: "tipo-lote", name: "Lote" },
      axes: [AREA],
    });

    expect(screen.getByRole("button", { name: /añadir variante/i })).toBeInTheDocument();
    expect(screen.queryByText(/ejes de variante/i)).toBeNull();
  });

  it("mientras el tipo carga, ni botón ni aviso (sin parpadeo)", () => {
    renderTable({ product: product("tipo-lote"), axesReady: false });

    expect(screen.queryByRole("button", { name: /añadir variante/i })).toBeNull();
    expect(screen.queryByText(/ejes de variante/i)).toBeNull();
  });

  it("sin permiso de gestión (o espejo de Shopify), nada cambia: ni botón ni aviso", () => {
    renderTable({ product: product(null), canManage: false });

    expect(screen.queryByRole("button", { name: /añadir variante/i })).toBeNull();
    expect(screen.queryByText(/ejes de variante/i)).toBeNull();
  });

  it("si el tipo no pudo cargarse, se conserva el botón: mejor el 409 claro del server que esconderlo", () => {
    renderTable({ product: product("tipo-lote"), productType: null });

    expect(screen.getByRole("button", { name: /añadir variante/i })).toBeInTheDocument();
  });
});
