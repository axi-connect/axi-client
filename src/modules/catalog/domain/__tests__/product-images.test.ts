import {
  IMAGE_IMPORT_POLL_MS,
  IMAGE_IMPORT_POLL_TIMEOUT_MS,
  PRODUCT_IMAGE_MAX_BYTES,
  groupProductImages,
  hasPendingImages,
  imageImportPollInterval,
  validateImageFile,
  type ProductImageDTO,
} from "../product";

/** Fixture mínimo de una imagen de galería (F16). */
function image(overrides: Partial<ProductImageDTO> = {}): ProductImageDTO {
  return {
    id: "img-1",
    variant_id: null,
    position: 0,
    alt_text: null,
    source: "upload",
    status: "ready",
    source_url: null,
    mime_type: "image/jpeg",
    size_bytes: 1024,
    width: 800,
    height: 600,
    error: null,
    url: "https://storage/thumb",
    created_at: "2026-07-18T16:00:00.000Z",
    ...overrides,
  };
}

describe("groupProductImages", () => {
  it("separa fotos del producto (variant_id null) de las de variante", () => {
    const images = [
      image({ id: "p1" }),
      image({ id: "v1", variant_id: "var-a" }),
      image({ id: "p2", position: 1 }),
      image({ id: "v2", variant_id: "var-b" }),
    ];
    const { productImages, byVariant } = groupProductImages(images);
    expect(productImages.map((i) => i.id)).toEqual(["p1", "p2"]);
    expect(byVariant.get("var-a")?.map((i) => i.id)).toEqual(["v1"]);
    expect(byVariant.get("var-b")?.map((i) => i.id)).toEqual(["v2"]);
  });

  it("ordena por position dentro de cada contenedor (robusto ante desorden)", () => {
    const images = [
      image({ id: "p-b", position: 2 }),
      image({ id: "p-a", position: 0 }),
      image({ id: "v-b", variant_id: "var-a", position: 1 }),
      image({ id: "p-m", position: 1 }),
      image({ id: "v-a", variant_id: "var-a", position: 0 }),
    ];
    const { productImages, byVariant } = groupProductImages(images);
    expect(productImages.map((i) => i.id)).toEqual(["p-a", "p-m", "p-b"]);
    expect(byVariant.get("var-a")?.map((i) => i.id)).toEqual(["v-a", "v-b"]);
  });

  it("tolera undefined (campo opcional del DTO) y galería vacía", () => {
    expect(groupProductImages(undefined)).toEqual({ productImages: [], byVariant: new Map() });
    expect(groupProductImages([])).toEqual({ productImages: [], byVariant: new Map() });
  });
});

describe("validateImageFile (validación cliente pre-upload)", () => {
  const makeFile = (type: string, size: number) => {
    const file = new File(["x"], "foto.jpg", { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  it.each(["image/jpeg", "image/png", "image/webp"])("acepta %s dentro del límite", (type) => {
    expect(validateImageFile(makeFile(type, 1024))).toBeNull();
  });

  it.each(["image/gif", "application/pdf", "video/mp4", ""])(
    "rechaza formato no soportado (%s)",
    (type) => {
      expect(validateImageFile(makeFile(type, 1024))).toMatch(/JPEG, PNG o WebP/);
    },
  );

  it("rechaza archivos de más de 5 MB (tope de WhatsApp)", () => {
    expect(validateImageFile(makeFile("image/jpeg", PRODUCT_IMAGE_MAX_BYTES + 1))).toMatch(/5 MB/);
    expect(validateImageFile(makeFile("image/jpeg", PRODUCT_IMAGE_MAX_BYTES))).toBeNull();
  });
});

describe("hasPendingImages / imageImportPollInterval (polling del import)", () => {
  it("detecta imports en curso", () => {
    expect(hasPendingImages(undefined)).toBe(false);
    expect(hasPendingImages([image()])).toBe(false);
    expect(hasPendingImages([image(), image({ id: "i2", status: "pending" })])).toBe(true);
  });

  it("sin pendientes → detiene el polling", () => {
    expect(imageImportPollInterval(false, 0)).toBe(false);
  });

  it("con pendientes → 3 s hasta agotar el presupuesto de 30 s", () => {
    expect(imageImportPollInterval(true, 0)).toBe(IMAGE_IMPORT_POLL_MS);
    expect(imageImportPollInterval(true, IMAGE_IMPORT_POLL_TIMEOUT_MS - 1)).toBe(IMAGE_IMPORT_POLL_MS);
    expect(imageImportPollInterval(true, IMAGE_IMPORT_POLL_TIMEOUT_MS)).toBe(false);
  });
});
