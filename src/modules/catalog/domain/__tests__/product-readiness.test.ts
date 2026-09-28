import { productReadiness, readinessHeadline } from "../product-readiness";
import type { ProductDTO } from "../product";
import type { ProductTypeDTO } from "../product-type";

type Variant = ProductDTO["variants"][number];
type Image = NonNullable<ProductDTO["images"]>[number];

const variant = (id: string, overrides: Partial<Variant> = {}): Variant => ({
  id,
  sku: id.toUpperCase(),
  name: null,
  attributes: {},
  price_cents: 8_900_000,
  service_date: null,
  is_default: false,
  is_active: true,
  position: 0,
  stock: { on_hand: 10, out_of_stock_threshold: 0, available: true },
  ...overrides,
});

const image = (id: string, variant_id: string | null = null, status: Image["status"] = "ready") =>
  ({ id, variant_id, status }) as Image;

const product = (overrides: Partial<ProductDTO> = {}): ProductDTO =>
  ({
    id: "p1",
    kind: "product",
    is_active: true,
    variants: [variant("v30", { name: "30 ml" }), variant("v50", { name: "50 ml" })],
    images: [image("i1"), image("i2"), image("i3"), image("i4"), image("i5", "v30")],
    attribute_values: [{ code: "activo", label: "Ingrediente activo", type: "text", value: "Vitamina C" }],
    enrichment: { status: "ready", edited_by_user_at: null },
    ...overrides,
  }) as unknown as ProductDTO;

const type = {
  id: "t1",
  name: "Dermocosmético",
  attributes: [
    { code: "tipo_piel", label: "Tipo de piel", scope: "product", is_required: true },
    { code: "activo", label: "Ingrediente activo", scope: "product", is_required: false },
    { code: "volumen", label: "Volumen", scope: "variant", is_required: true },
  ],
} as unknown as ProductTypeDTO;

describe("«Para que tu agente lo venda» (catálogo premium F3)", () => {
  it("el caso del canvas: falta el tipo de piel y 50 ml no tiene fotos; lo demás está bien", () => {
    const readiness = productReadiness(product(), type);
    expect(readiness.items.map((item) => [item.key, item.title, item.href])).toEqual([
      ["missing_attributes", "Falta el tipo de piel", "#atributos"],
      ["variants_without_photos", "50 ml no tiene fotos", "#fotos"],
    ]);
    expect(readiness.items[0].action).toBe("Completar el tipo de piel");
    expect(readiness.ready).toEqual(["4 fotos", "las 2 variantes tienen stock", "búsqueda con IA lista"]);
    expect(readinessHeadline(readiness)).toBe("Le faltan 2 cosas a esta ficha");
  });

  it("sin fotos del producto: lo dice (y no se queja de las variantes, que usarían las del producto)", () => {
    const readiness = productReadiness(product({ images: [image("i9", null, "failed")] }), null);
    expect(readiness.items.map((item) => item.key)).toEqual(["no_photos"]);
  });

  it("agotado del todo es rojo; una variante agotada es ámbar y la nombra", () => {
    const out = { on_hand: 0, out_of_stock_threshold: 0, available: false };
    const all = productReadiness(product({ variants: [variant("a", { stock: out })] }), null);
    expect(all.items.find((item) => item.key === "out_of_stock")).toMatchObject({ title: "Está agotado", tone: "destructive" });
    const one = productReadiness(product({ variants: [variant("a", { stock: out, name: "50 ml" }), variant("b")] }), null);
    expect(one.items.find((item) => item.key === "out_of_stock")).toMatchObject({ title: "50 ml está agotada", tone: "warning" });
  });

  it("inactivo, sin búsqueda con IA y servicios (sin stock que revisar)", () => {
    const readiness = productReadiness(
      product({ kind: "service", is_active: false, enrichment: null, variants: [variant("s", { stock: null })] }),
      null,
    );
    expect(readiness.items.map((item) => item.key)).toEqual(["inactive", "enrichment"]);
    expect(readiness.items[1]).toMatchObject({ action: "Generar con IA", href: "#busqueda-ia" });
  });

  it("producto de la tienda (F5): lo que manda Shopify se resuelve allá y la acción solo lleva a verlo", () => {
    const readiness = productReadiness(
      product({
        images: [],
        governed_by_connection_id: "c1",
        locked_fields: ["name", "description", "price", "status", "category", "variants", "stock", "images"],
        variants: [variant("a", { stock: { on_hand: 0, out_of_stock_threshold: 0, available: false } })],
      }),
      type,
    );
    expect(readiness.items.map((item) => [item.key, item.detail, item.action])).toEqual([
      ["no_photos", "súbelas en tu tienda conectada", "Ver las fotos"],
      ["out_of_stock", "el stock lo manda tu tienda conectada", "Ver el stock"],
      ["missing_attributes", "atributo requerido · tu agente lo usa para recomendar", "Ver los atributos"],
    ]);
  });

  it("todo listo: titular en positivo y sin filas", () => {
    const readiness = productReadiness(
      product({ variants: [variant("v30")], attribute_values: [{ code: "tipo_piel", label: "Tipo de piel", type: "select", value: "Mixta" }] as ProductDTO["attribute_values"] }),
      type,
    );
    expect(readiness.items).toEqual([]);
    expect(readinessHeadline(readiness)).toBe("Lista para que tu agente la venda");
  });
});
