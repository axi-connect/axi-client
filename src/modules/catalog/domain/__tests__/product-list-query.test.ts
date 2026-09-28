import {
  hasProductListFilters,
  parseProductListQuery,
  productFilterChips,
  serializeProductListQuery,
  toListParams,
  withFilter,
  withoutFilters,
} from "../product-list-query";

const CAT = "0192f0a4-1c2d-7abc-8def-0123456789ab";
const parse = (search: string) => parseProductListQuery(new URLSearchParams(search));

describe("estado del listado en la URL (catálogo premium F2)", () => {
  it("lee filtros, búsqueda y página; lo que no entiende lo ignora", () => {
    expect(
      parse(`q=%20sérum%20&catalog_id=${CAT}&kind=service&is_active=false&has_images=false&stock_state=out&uncategorized=true&enrichment_status=failed&page=3`),
    ).toEqual({
      q: "sérum",
      catalog_id: CAT,
      category_id: undefined,
      kind: "service",
      is_active: false,
      has_images: false,
      stock_state: "out",
      uncategorized: true,
      enrichment_status: "failed",
      page: 3,
    });
    // Un id que no es uuid, un enum inventado o una página rara: fuera, sin 400 del backend
    expect(parse("catalog_id=abc&kind=robot&stock_state=bajo&page=-2&has_images=si")).toEqual({ page: 1 });
  });

  it("escribe la URL canónica: sin valores por omisión y en orden fijo", () => {
    expect(serializeProductListQuery({ page: 1 })).toBe("");
    expect(serializeProductListQuery({ page: 2, stock_state: "out", q: "gel" })).toBe("q=gel&stock_state=out&page=2");
    // ida y vuelta
    const search = `q=gel&category_id=${CAT}&has_images=false&page=4`;
    expect(serializeProductListQuery(parse(search))).toBe(search);
  });

  it("cambiar un filtro vuelve a la página 1; limpiar conserva la búsqueda", () => {
    const query = parse("q=gel&kind=product&page=5");
    expect(withFilter(query, "is_active", true)).toMatchObject({ is_active: true, kind: "product", page: 1 });
    expect(withoutFilters(query)).toEqual({ q: "gel", page: 1 });
    expect(hasProductListFilters(query)).toBe(true);
    expect(hasProductListFilters(parse("q=gel&page=2"))).toBe(false);
  });

  it("la búsqueda y la página no van en los filtros del backend", () => {
    expect(toListParams(parse("q=gel&page=2&stock_state=low"))).toEqual({
      catalog_id: undefined,
      category_id: undefined,
      kind: undefined,
      is_active: undefined,
      has_images: undefined,
      stock_state: "low",
      uncategorized: undefined,
      enrichment_status: undefined,
    });
  });

  it("un chip por filtro, con nombre que se entiende sin abrir el selector", () => {
    const query = parse(`catalog_id=${CAT}&is_active=false&has_images=false&stock_state=low&enrichment_status=none`);
    expect(productFilterChips(query, { catalog: "Catálogo principal" }).map((chip) => chip.label)).toEqual([
      "Catálogo principal",
      "Inactivos",
      "Sin fotos",
      "Con una variante agotada",
      "Búsqueda con IA sin generar",
    ]);
    // Sin el nombre todavía (el contexto no cargó): dice qué filtra
    expect(productFilterChips(parse(`category_id=${CAT}`), {}).map((chip) => chip.label)).toEqual(["Una categoría"]);
  });
});
