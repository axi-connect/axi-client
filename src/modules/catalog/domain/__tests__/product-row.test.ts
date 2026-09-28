import {
  productPriceRangeLabel,
  productSku,
  productStockText,
  unavailableVariantCount,
  type ProductListItemDTO,
} from "../product";

type Variant = ProductListItemDTO["variants"][number];

const variant = (overrides: Partial<Variant> = {}): Variant => ({
  id: "v",
  sku: "SKU",
  name: null,
  attributes: {},
  price_cents: 8_900_000,
  service_date: null,
  is_default: false,
  is_active: true,
  position: 0,
  stock: null,
  ...overrides,
});

const item = (variants: Variant[], kind: ProductListItemDTO["kind"] = "product") =>
  ({ kind, variants, price_cents: 5_000_000, currency: "COP" }) as unknown as ProductListItemDTO;

const money = (cents: number) => `$ ${String(cents / 100)}`;

describe("la fila de un producto (catálogo premium F2)", () => {
  it("precio: el rango de las variantes activas si difieren; si no, uno", () => {
    const variants = [
      variant({ price_cents: 8_900_000 }),
      variant({ price_cents: 12_900_000 }),
      variant({ price_cents: 99_900_000, is_active: false }),
    ];
    expect(productPriceRangeLabel(item(variants), money)).toBe("$ 89000 – $ 129000");
    expect(productPriceRangeLabel(item([variant(), variant()]), money)).toBe("$ 89000");
    // Sin variantes activas: el precio base
    expect(productPriceRangeLabel(item([variant({ is_active: false })]), money)).toBe("$ 50000");
  });

  it("SKU: el de la variante por defecto, si no el de la primera", () => {
    expect(productSku(item([variant({ sku: "A" }), variant({ sku: "B", is_default: true })]))).toBe("B");
    expect(productSku(item([variant({ sku: "A" })]))).toBe("A");
    expect(productSku(item([]))).toBeNull();
  });

  it("variantes agotadas: solo activas con inventario; los servicios no cuentan", () => {
    const out = { on_hand: 0, out_of_stock_threshold: 0, available: false };
    expect(unavailableVariantCount(item([variant({ stock: out }), variant({ stock: out, is_active: false }), variant()]))).toBe(1);
    expect(unavailableVariantCount(item([variant({ stock: out })], "service"))).toBe(0);
  });

  it("stock: «bajo» se dice literal («1 variante agotada»), no «Stock bajo»", () => {
    expect(productStockText({ stock_state: "low", stock_total: 11, unavailable_variant_count: 1 })).toEqual({
      figure: "11",
      label: "1 variante agotada",
    });
    expect(productStockText({ stock_state: "low", stock_total: 4, unavailable_variant_count: 2 }).label).toBe(
      "2 variantes agotadas",
    );
    expect(productStockText({ stock_state: "ok", stock_total: 1, unavailable_variant_count: 0 })).toEqual({
      figure: "1",
      label: "disponible",
    });
    expect(productStockText({ stock_state: "out", stock_total: 0, unavailable_variant_count: 2 })).toEqual({
      figure: "0",
      label: "agotado",
    });
    expect(productStockText({ stock_state: "untracked", stock_total: null, unavailable_variant_count: 0 })).toEqual({
      figure: null,
      label: "sin control de stock",
    });
    expect(productStockText({ stock_state: "none", stock_total: null, unavailable_variant_count: 0 }).label).toBe("no aplica");
  });
});
