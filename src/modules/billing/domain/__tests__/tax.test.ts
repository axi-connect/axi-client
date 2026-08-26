import { hasTaxes, lineTaxNote, taxLabel, totalTaxCents } from "../tax";

describe("taxLabel", () => {
  it("la licencia SaaS es EXCLUIDA, y así se dice", () => {
    // «IVA 0 %» es incorrecto tributariamente: excluido, exento y gravado al
    // 0 % son tres figuras distintas del Estatuto Tributario.
    expect(taxLabel("excluded")).toBe("Excluido de IVA");
    expect(taxLabel("excluded")).not.toContain("0 %");
  });

  it("exento no se confunde con excluido", () => {
    expect(taxLabel("exempt")).toBe("Exento de IVA");
  });

  it("un servicio conexo gravado muestra su tarifa real", () => {
    expect(taxLabel("taxed", 1_900)).toBe("IVA 19 %");
    expect(taxLabel("taxed", 500)).toBe("IVA 5 %");
  });

  it("gravado sin tarifa no inventa un porcentaje", () => {
    expect(taxLabel("taxed", 0)).toBe("Gravado");
  });

  it("un tratamiento desconocido se muestra crudo antes que traducirse a la fuerza", () => {
    expect(taxLabel("regimen_especial")).toBe("regimen_especial");
  });
});

describe("lineTaxNote", () => {
  it("con impuesto se puede ser preciso", () => {
    expect(lineTaxNote({ tax_cents: 1_900_000 })).toBe("IVA incluido");
  });

  it("SIN impuesto devuelve null y NO escribe «Excluido de IVA» por su cuenta", () => {
    // La línea del detalle del tenant no trae `tax_treatment`: excluido, exento
    // y 0 % dan todos `tax_cents: 0`. La exclusión se declara a nivel de
    // documento, donde es cierta por ley, no adivinando fila a fila.
    expect(lineTaxNote({ tax_cents: 0 })).toBeNull();
  });
});

describe("hasTaxes y totalTaxCents", () => {
  const lines = [{ tax_cents: 0 }, { tax_cents: 1_900_000 }, { tax_cents: 0 }];

  it("detecta la línea gravada entre las excluidas", () => {
    expect(hasTaxes(lines)).toBe(true);
    expect(hasTaxes([{ tax_cents: 0 }, { tax_cents: 0 }])).toBe(false);
  });

  it("suma LÍNEA A LÍNEA, no un IVA global de la factura", () => {
    // Una misma factura puede llevar una línea excluida y otra gravada: aplicar
    // un porcentaje al total daría un importe que no cuadra con ninguna.
    expect(totalTaxCents(lines)).toBe(1_900_000);
    expect(totalTaxCents([])).toBe(0);
  });
});
