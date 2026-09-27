import { catalogNextUpHeadline, catalogNextUpItems, share, type CatalogSummaryDTO } from "../catalog-summary";

function summary(attention: Partial<CatalogSummaryDTO["attention"]> = {}): CatalogSummaryDTO {
  return {
    products: { total: 128, active: 118, inactive: 10, physical: 76, services: 42 },
    stock: { ok: 60, low: 3, out: 7, untracked: 6 },
    attention: { without_images: 0, out_of_stock: 0, uncategorized: 0, enrichment_failed: 0, ...attention },
  };
}

describe("isla «Lo próximo» del catálogo (catálogo premium F2)", () => {
  it("ordena por lo que más le cuesta al agente y cada fila abre su filtro", () => {
    const items = catalogNextUpItems(summary({ without_images: 14, out_of_stock: 7, uncategorized: 5, enrichment_failed: 2 }));
    expect(items.map((item) => [item.key, item.count, item.href])).toEqual([
      ["without_images", 14, "/catalog/products?has_images=false"],
      ["out_of_stock", 7, "/catalog/products?stock_state=out"],
      ["uncategorized", 5, "/catalog/products?uncategorized=true"],
      ["enrichment_failed", 2, "/catalog/products?enrichment_status=failed"],
    ]);
    expect(catalogNextUpHeadline(items)).toBe("14 productos que tu agente no puede mostrar");
    expect(items[0].action).toBe("Ver los 14 sin fotos");
  });

  it("solo aparece lo que tiene algo; el titular sale de la fila más grave", () => {
    const items = catalogNextUpItems(summary({ out_of_stock: 1, enrichment_failed: 3 }));
    expect(items.map((item) => item.key)).toEqual(["out_of_stock", "enrichment_failed"]);
    expect(items[0]).toMatchObject({ title: "está agotado", action: "Ver el agotado" });
    expect(catalogNextUpHeadline(items)).toBe("1 producto agotado");
  });

  it("sin nada pendiente: «Todo listo para vender»", () => {
    expect(catalogNextUpItems(summary())).toEqual([]);
    expect(catalogNextUpHeadline([])).toBe("Todo listo para vender");
  });

  it("la barra de progreso no se sale ni se vuelve negativa", () => {
    expect(share(96, 128)).toBe(75);
    expect(share(5, 0)).toBe(0);
    expect(share(200, 100)).toBe(100);
  });
});
