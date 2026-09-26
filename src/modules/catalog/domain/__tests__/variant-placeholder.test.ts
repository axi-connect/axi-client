import { variantNamePlaceholder } from "@/modules/catalog/domain/product-type";
import { variantLabelText } from "@/modules/orders/domain/order";

describe("QA F1–F3: fechas de salida en su idioma", () => {
  it("el ejemplo del nombre habla de salidas cuando un eje de variante es fecha; si no, el de siempre", () => {
    expect(
      variantNamePlaceholder([{ type: "date", scope: "variant" }]),
    ).toMatch(/^Salida del/);
    expect(variantNamePlaceholder([{ type: "select", scope: "variant" }])).toBe(
      "Roja · M (opcional)",
    );
    // Una fecha de ámbito PRODUCTO no es un eje de variante
    expect(variantNamePlaceholder([{ type: "date", scope: "product" }])).toBe(
      "Roja · M (opcional)",
    );
  });

  it("una variante que es una fecha se lee como fecha; otra etiqueta, tal cual", () => {
    expect(variantLabelText("2026-10-01")).toBe("01 de oct de 2026");
    expect(variantLabelText("Talla M")).toBe("Talla M");
  });
});
