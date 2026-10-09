import {
  IMAGE_IMPORT_POLL_MS,
  IMAGE_IMPORT_POLL_TIMEOUT_MS,
  PRODUCT_IMAGE_INPUT_MAX_BYTES,
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

describe("validateImageFile (lo elegido, antes de reducir)", () => {
  const makeFile = (name: string, type: string, size: number) => {
    const file = new File(["x"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  it.each([
    ["foto.jpg", "image/jpeg"],
    ["foto.png", "image/png"],
    ["foto.webp", "image/webp"],
    ["IMG_4025.HEIC", "image/heic"],
  ])("acepta %s", (name, type) => {
    expect(validateImageFile(makeFile(name, type, 1024))).toBeNull();
  });

  it("acepta un HEIC sin tipo (Windows no lo etiqueta) por su extensión", () => {
    expect(validateImageFile(makeFile("IMG_4025.heic", "", 1024))).toBeNull();
  });

  it.each([
    ["animacion.gif", "image/gif"],
    ["factura.pdf", "application/pdf"],
    ["video.mp4", "video/mp4"],
    ["sin-extension", ""],
  ])("rechaza %s", (name, type) => {
    expect(validateImageFile(makeFile(name, type, 1024))).toMatch(/JPG, PNG o WebP/);
  });

  it("una foto de celular de 12 MB pasa: el tope de 5 MB se aplica DESPUÉS de reducir", () => {
    expect(validateImageFile(makeFile("IMG.jpg", "image/jpeg", 12 * 1024 * 1024))).toBeNull();
  });

  it("más de 40 MB no se intenta reducir", () => {
    expect(validateImageFile(makeFile("IMG.jpg", "image/jpeg", PRODUCT_IMAGE_INPUT_MAX_BYTES + 1))).toMatch(/40 MB/);
    expect(validateImageFile(makeFile("IMG.jpg", "image/jpeg", PRODUCT_IMAGE_INPUT_MAX_BYTES))).toBeNull();
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
