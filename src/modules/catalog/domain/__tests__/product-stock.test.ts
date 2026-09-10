import { aggregateStock, type ProductListItemDTO } from "../product";

type Variant = ProductListItemDTO["variants"][number];

/** Fixture mínimo de variante; `stock: null` = sin fila de inventario. */
function variant(overrides: Partial<Variant> = {}): Variant {
  return {
    id: "var-1",
    sku: "SKU-1",
    name: null,
    attributes: {},
    price_cents: 1000,
    is_default: true,
    is_active: true,
    position: 0,
    stock: null,
    ...overrides,
  };
}

function product(variants: Variant[], kind: ProductListItemDTO["kind"] = "product"): ProductListItemDTO {
  return { kind, variants } as unknown as ProductListItemDTO;
}

const tracked = (available: boolean, on_hand = available ? 5 : 0) => ({
  on_hand,
  out_of_stock_threshold: 0,
  available,
});

/**
 * Incidente 2026-09-10 §5.1: el backend trata «sin fila de inventario» como
 * DISPONIBLE (stock no rastreado). El panel lo leía como agotado y pintó en
 * rojo los 157 productos de un tenant que el agente sí vendía.
 */
describe("aggregateStock", () => {
  it("sin ninguna fila de inventario: «sin control de stock», nunca agotado", () => {
    expect(aggregateStock(product([variant(), variant({ id: "var-2", sku: "SKU-2" })]))).toEqual({
      total: null,
      state: "untracked",
    });
  });

  it("todas las rastreadas agotadas: agotado", () => {
    const item = product([
      variant({ stock: tracked(false) }),
      variant({ id: "var-2", sku: "SKU-2", stock: tracked(false) }),
    ]);
    expect(aggregateStock(item)).toEqual({ total: 0, state: "out" });
  });

  it("una rastreada agotada y otra sin fila: stock bajo (la sin fila cuenta como disponible)", () => {
    const item = product([variant({ stock: tracked(false) }), variant({ id: "var-2", sku: "SKU-2" })]);
    expect(aggregateStock(item)).toEqual({ total: 0, state: "low" });
  });

  it("todas rastreadas y disponibles: ok con el total sumado", () => {
    const item = product([
      variant({ stock: tracked(true, 3) }),
      variant({ id: "var-2", sku: "SKU-2", stock: tracked(true, 4) }),
    ]);
    expect(aggregateStock(item)).toEqual({ total: 7, state: "ok" });
  });

  it("servicios no tienen stock", () => {
    expect(aggregateStock(product([variant()], "service"))).toEqual({ total: null, state: "none" });
  });

  it("sin variantes activas: agotado", () => {
    expect(aggregateStock(product([variant({ is_active: false })]))).toEqual({ total: 0, state: "out" });
  });
});
