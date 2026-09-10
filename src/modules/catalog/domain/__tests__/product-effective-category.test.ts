import {
  effectiveCategoryNote,
  effectiveCategoryState,
  type EffectiveCategoryDTO,
} from "../product";

const base: EffectiveCategoryDTO = {
  id: "cat-jeans",
  name: "Jeans",
  source: "alias_match",
  confidence: 0.8,
  is_automatic: true,
};

/** Plan catalog_taxonomy_classification (D5): los tres estados que pinta el detalle. */
describe("effectiveCategoryState", () => {
  it("sin categoría → none", () => {
    expect(effectiveCategoryState(null)).toBe("none");
    expect(effectiveCategoryState(undefined)).toBe("none");
  });

  it("automática del clasificador → automatic; por colección de la tienda → external", () => {
    expect(effectiveCategoryState(base)).toBe("automatic");
    expect(effectiveCategoryState({ ...base, source: "shopify_collection", confidence: 0.95 })).toBe("external");
  });

  it("fijada o confirmada por el tenant → fixed", () => {
    expect(effectiveCategoryState({ ...base, is_automatic: false, source: "tenant", confidence: null })).toBe("fixed");
    expect(effectiveCategoryState({ ...base, is_automatic: false })).toBe("fixed");
  });
});

describe("effectiveCategoryNote", () => {
  it("«automática · 80 % · por el nombre»", () => {
    expect(effectiveCategoryNote(base)).toBe("automática · 80 % · por el nombre");
  });

  it("fijada por el tenant: sin porcentaje", () => {
    expect(effectiveCategoryNote({ ...base, is_automatic: false, source: "tenant", confidence: null })).toBe(
      "fijada por ti",
    );
  });
});
