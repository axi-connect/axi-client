import {
  headerMediaAccept,
  headerMediaHint,
  validateHeaderMediaFile,
} from "@/modules/marketing/domain/header-media";

const MB = 1024 * 1024;

describe("validateHeaderMediaFile · se dice ANTES de subir, con qué hacer", () => {
  it("una imagen JPG de 400 KB sirve", () => {
    expect(validateHeaderMediaFile({ name: "promo.jpg", type: "image/jpeg", size: 400 * 1024 }, "image")).toBeNull();
  });

  it("un WebP no: Meta solo acepta JPG o PNG en la cabecera", () => {
    expect(validateHeaderMediaFile({ name: "banner.webp", type: "image/webp", size: 1000 }, "image")).toBe(
      "«banner.webp» es WebP. En la cabecera, Meta solo acepta JPG o PNG.",
    );
  });

  it("un video demasiado grande dice cuánto pesa y el tope", () => {
    expect(validateHeaderMediaFile({ name: "lanzamiento.mp4", type: "video/mp4", size: 48 * MB }, "video")).toBe(
      "«lanzamiento.mp4» pesa 48 MB. El video de la cabecera va en MP4 y hasta 16 MB.",
    );
  });

  it("el documento: PDF, con NUESTRO tope de 25 MB y no los 100 de Meta", () => {
    expect(validateHeaderMediaFile({ name: "catalogo.pdf", type: "application/pdf", size: 24 * MB }, "document")).toBeNull();
    expect(validateHeaderMediaFile({ name: "catalogo.pdf", type: "application/pdf", size: 26 * MB }, "document")).toMatch(
      /hasta 25 MB/,
    );
  });

  it("un archivo vacío no se sube", () => {
    expect(validateHeaderMediaFile({ name: "nada.png", type: "image/png", size: 0 }, "image")).toMatch(/está vacío/);
  });

  it("el mime con parámetros cuenta como su base", () => {
    expect(validateHeaderMediaFile({ name: "a.png", type: "image/png; charset=binary", size: 10 }, "image")).toBeNull();
  });
});

describe("lo que acompaña al selector", () => {
  it("accept y la línea de formatos", () => {
    expect(headerMediaAccept("image")).toBe("image/jpeg,image/png");
    expect(headerMediaHint("image")).toBe("JPG o PNG, hasta 5 MB");
    expect(headerMediaHint("document")).toBe("PDF, hasta 25 MB");
  });
});
