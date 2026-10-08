import type { ProductDTO, ProductImageDTO, ProductVariantDTO } from "../product";
import {
  backToProductTarget,
  compactVariantMark,
  currentUseLabel,
  effectivePrimaryImage,
  effectiveVariantPrimary,
  fitWithin,
  formatBytes,
  imagesForVariant,
  needsReencode,
  principalFirst,
  splitByRemaining,
  variantAssignments,
  variantGroupShortcuts,
  variantShortLabel,
  variantsByPrimaryImage,
  type VariantChoice,
} from "../product-gallery";

function image(id: string, overrides: Partial<ProductImageDTO> = {}): ProductImageDTO {
  return {
    id,
    variant_id: null,
    position: 0,
    alt_text: null,
    source: "upload",
    status: "ready",
    source_url: null,
    mime_type: "image/jpeg",
    size_bytes: 1024,
    width: 800,
    height: 800,
    error: null,
    url: `https://storage/${id}_thumb.jpg`,
    created_at: "2026-10-08T12:00:00.000Z",
    ...overrides,
  };
}

function variant(id: string, overrides: Partial<ProductVariantDTO> = {}): ProductVariantDTO {
  return {
    id,
    sku: `SKU-${id}`,
    name: null,
    attributes: {},
    price_cents: 4_990_000,
    service_date: null,
    is_default: false,
    is_active: true,
    position: 0,
    primary_image_id: null,
    stock: null,
    ...overrides,
  };
}

type GalleryProduct = Pick<ProductDTO, "variants" | "images" | "primary_image_id">;

describe("effectivePrimaryImage (espejo del servidor, D2)", () => {
  const gallery = [image("g1", { position: 1 }), image("g0"), image("m0", { variant_id: "v-m" })];

  it("la elegida manda aunque no sea la primera", () => {
    expect(effectivePrimaryImage(gallery, "g1")?.id).toBe("g1");
  });

  it("sin elección: la primera general por position, venga en el orden que venga", () => {
    expect(effectivePrimaryImage(gallery, null)?.id).toBe("g0");
    expect(effectivePrimaryImage([...gallery].reverse(), null)?.id).toBe("g0");
  });

  it("una elegida pendiente o fallida no cuenta: cae a la siguiente lista", () => {
    expect(effectivePrimaryImage([image("x", { status: "pending" }), image("y", { position: 2 })], "x")?.id).toBe("y");
  });

  it("solo fotos de variante: la primera de ellas; sin fotos listas, null", () => {
    expect(effectivePrimaryImage([image("m0", { variant_id: "v-m" })], null)?.id).toBe("m0");
    expect(effectivePrimaryImage([image("f", { status: "failed" })], null)).toBeNull();
  });
});

describe("effectiveVariantPrimary (D2/D3)", () => {
  const gallery = [
    image("g0"),
    image("g1", { position: 1 }),
    image("m0", { variant_id: "v-m" }),
    image("l0", { variant_id: "v-l" }),
  ];

  it("una foto general elegida para ella: «chosen»", () => {
    expect(effectiveVariantPrimary(gallery, variant("v-m", { primary_image_id: "g1" }), null)).toMatchObject({
      image: { id: "g1" },
      source: "chosen",
    });
  });

  it("la foto de una variante hermana NO vale: cae a su propia", () => {
    expect(effectiveVariantPrimary(gallery, variant("v-m", { primary_image_id: "l0" }), null)).toMatchObject({
      image: { id: "m0" },
      source: "own",
    });
  });

  it("sin elección ni propias: hereda la del producto", () => {
    expect(effectiveVariantPrimary(gallery, variant("v-s"), "g1")).toMatchObject({ image: { id: "g1" }, source: "product" });
  });
});

describe("variantsByPrimaryImage (las píldoras «S · M»)", () => {
  it("marca las que la eligieron o la tienen como propia, no las que heredan", () => {
    const product: GalleryProduct = {
      primary_image_id: "g0",
      images: [image("g0"), image("g1", { position: 1 }), image("l0", { variant_id: "v-l" })],
      variants: [variant("v-s", { primary_image_id: "g1" }), variant("v-m"), variant("v-l")],
    };
    const map = variantsByPrimaryImage(product);
    expect(map.get("g1")?.map((row) => row.id)).toEqual(["v-s"]);
    expect(map.get("l0")?.map((row) => row.id)).toEqual(["v-l"]);
    expect(map.has("g0")).toBe(false);
  });
});

describe("principalFirst e imagesForVariant", () => {
  it("la principal delante y el resto por position", () => {
    const rows = [image("a"), image("b", { position: 1 }), image("c", { position: 2 })];
    expect(principalFirst(rows, "c").map((row) => row.id)).toEqual(["c", "a", "b"]);
    expect(principalFirst(rows, null).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("lo que muestra una variante: su principal (aunque sea general) y sus propias", () => {
    const rows = [image("g0"), image("g1", { position: 1 }), image("m0", { variant_id: "v-m" })];
    const shown = imagesForVariant(rows, variant("v-m", { primary_image_id: "g1" }), null);
    expect(shown.map((row) => row.id)).toEqual(["g1", "m0"]);
  });
});

describe("variantAssignments («Usar en variante…», un guardado)", () => {
  const product: GalleryProduct = {
    primary_image_id: "g0",
    images: [image("g0"), image("g1", { position: 1 }), image("l0", { variant_id: "v-l" })],
    variants: [
      variant("v-s"),
      variant("v-m", { primary_image_id: "g1" }),
      variant("v-l", { primary_image_id: "l0" }),
    ],
  };
  const choices = (entries: [string, VariantChoice][]) => new Map(entries);

  it("una variante que el panel no nombra no se toca", () => {
    expect(variantAssignments(product, "g1", choices([]))).toEqual([]);
  });

  it("solo viaja lo que cambia", () => {
    expect(variantAssignments(product, "g1", choices([["v-s", "this"], ["v-m", "this"]]))).toEqual([
      { variant_id: "v-s", image_id: "g1" },
    ]);
  });

  it("desmarcar una que la tenía elegida la suelta (null)", () => {
    expect(variantAssignments(product, "g1", choices([["v-m", "keep"]]))).toEqual([{ variant_id: "v-m", image_id: null }]);
  });

  it("«la del producto» va EXPLÍCITA si la variante tiene fotos propias; si no, null", () => {
    expect(variantAssignments(product, "g1", choices([["v-l", "product"]]))).toEqual([{ variant_id: "v-l", image_id: "g0" }]);
    expect(variantAssignments(product, "g1", choices([["v-m", "product"]]))).toEqual([{ variant_id: "v-m", image_id: null }]);
  });

  it("backToProductTarget no apunta a la foto de otra variante", () => {
    const own = [image("l0", { variant_id: "v-l" }), image("m0", { variant_id: "v-m" })];
    expect(backToProductTarget(own, "v-l", own[1])).toBeNull();
  });

  it("currentUseLabel dice de dónde sale la foto de cada fila", () => {
    expect(currentUseLabel(product, product.variants[1], "g1")).toBe("esta foto");
    expect(currentUseLabel(product, product.variants[0], "g1")).toBe("la del producto");
    expect(currentUseLabel(product, product.variants[2], "g1")).toBe("su foto propia");
  });
});

describe("compactVariantMark (la píldora de una foto)", () => {
  const axes = ["talla", "color"];
  it("lo común una vez y lo que cambia en fila: «Blanco · S M L»", () => {
    const blancas = ["S", "M", "L"].map((talla) => variant(talla, { attributes: { talla, color: "Blanco" } }));
    expect(compactVariantMark(blancas, axes)).toBe("Blanco · S\u00a0M\u00a0L");
  });

  it("una sola variante: su etiqueta en el orden de los ejes", () => {
    expect(compactVariantMark([variant("a", { attributes: { color: "Negro", talla: "L" } })], axes)).toBe("L · Negro");
  });

  it("sin nada en común: las etiquetas enteras", () => {
    const mixtas = [
      variant("a", { attributes: { talla: "S", color: "Negro" } }),
      variant("b", { attributes: { talla: "M", color: "Blanco" } }),
    ];
    expect(compactVariantMark(mixtas, axes)).toBe("S · Negro, M · Blanco");
  });
});

describe("variantGroupShortcuts («Todo Negro / Todo Blanco»)", () => {
  it("usa el eje que agrupa en menos conjuntos (con al menos dos)", () => {
    // Tres tallas y dos colores: el color agrupa en menos conjuntos
    const variants = [
      variant("a", { attributes: { talla: "S", color: "Negro" } }),
      variant("b", { attributes: { talla: "M", color: "Negro" } }),
      variant("c", { attributes: { talla: "S", color: "Blanco" } }),
      variant("d", { attributes: { talla: "L", color: "Blanco" } }),
    ];
    expect(variantGroupShortcuts(variants)).toEqual([
      { label: "Todo Negro", variant_ids: ["a", "b"] },
      { label: "Todo Blanco", variant_ids: ["c", "d"] },
    ]);
  });

  it("sin ejes que agrupen, no hay atajos", () => {
    expect(variantGroupShortcuts([variant("a", { attributes: { talla: "S" } }), variant("b", { attributes: { talla: "M" } })])).toEqual([]);
  });

  it("variantShortLabel usa los valores de los ejes y, sin ejes, el nombre o el SKU", () => {
    expect(variantShortLabel(variant("a", { attributes: { talla: "M", color: "Negro" } }))).toBe("M · Negro");
    expect(variantShortLabel(variant("a", { name: "Única" }))).toBe("Única");
    expect(variantShortLabel(variant("a"))).toBe("SKU-a");
  });
});

describe("reducción antes de subir (D11)", () => {
  it("fitWithin reduce el borde mayor a 2048 y conserva la proporción", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1536, height: 2048 });
  });

  it("fitWithin nunca agranda una foto pequeña", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("needsReencode: un JPEG liviano que cabe se sube tal cual; el resto se reduce", () => {
    expect(needsReencode({ type: "image/jpeg", size: 500_000 }, { width: 1200, height: 900 })).toBe(false);
    expect(needsReencode({ type: "image/jpeg", size: 8_000_000 }, { width: 4032, height: 3024 })).toBe(true);
    expect(needsReencode({ type: "image/png", size: 500_000 }, { width: 1200, height: 900 })).toBe(true);
    expect(needsReencode({ type: "image/heic", size: 500_000 }, { width: 1200, height: 900 })).toBe(true);
  });

  it("splitByRemaining sube las primeras que caben y nombra el resto", () => {
    expect(splitByRemaining(["a", "b", "c", "d", "e"], 3)).toEqual({ accepted: ["a", "b", "c"], rejected: ["d", "e"] });
    expect(splitByRemaining(["a"], 0)).toEqual({ accepted: [], rejected: ["a"] });
  });

  it("formatBytes como lo lee una persona", () => {
    expect(formatBytes(8.2 * 1024 * 1024)).toBe("8,2 MB");
    expect(formatBytes(640 * 1024)).toBe("640 KB");
  });
});
