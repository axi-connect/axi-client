import {
  categoryAction,
  confidenceLabel,
  isReviewable,
  reviewDraftOf,
  remapExamples,
  reviewKey,
  signalLines,
} from "../template-category-review";

describe("template-category-review (hotfix 131049)", () => {
  it("el borrador a revisar es solo texto: sin media, sin copiar código y sin vacíos", () => {
    expect(
      reviewDraftOf({
        headerText: "  ",
        body: "  Hola {{1}}  ",
        footer: "Equipo Axi",
        buttons: [
          { type: "quick_reply", text: "Sí" },
          { type: "copy_code", example: "123" },
          { type: "url", text: " ", url: "https://x" },
        ],
      }),
    ).toEqual({ header: null, body: "Hola {{1}}", footer: "Equipo Axi", buttons: ["Sí"] });
  });

  it("la huella ignora mayúsculas y espacios", () => {
    expect(reviewKey({ body: "Hola  {{1}}\nYa" })).toBe(reviewKey({ body: "hola {{1}} ya" }));
    expect(reviewKey({ body: "Hola {{1}}" })).not.toBe(reviewKey({ body: "Hola {{2}}" }));
  });

  it("solo se revisa un cuerpo con algo que decir", () => {
    expect(isReviewable({ body: "Hola {{1}}" })).toBe(false);
    expect(isReviewable({ body: "Hola {{1}}, confirmamos que tu prueba comenzó hoy." })).toBe(true);
  });

  it("cambia sola solo si no la elegiste, está clara y no está bloqueada", () => {
    const marketing = { category: "marketing" as const, confident: true };
    expect(categoryAction({ current: "utility", review: marketing, touched: false, locked: false })).toBe("auto");
    expect(categoryAction({ current: "utility", review: marketing, touched: true, locked: false })).toBe("suggest");
    expect(
      categoryAction({ current: "utility", review: { ...marketing, confident: false }, touched: false, locked: false }),
    ).toBe("suggest");
    expect(categoryAction({ current: "utility", review: marketing, touched: false, locked: true })).toBe("none");
    expect(categoryAction({ current: "marketing", review: marketing, touched: false, locked: false })).toBe("none");
    expect(
      categoryAction({
        current: "utility",
        review: { category: "authentication", confident: true },
        touched: false,
        locked: false,
      }),
    ).toBe("none");
  });

  it("porcentaje solo con Jev; una línea por frase, con su etiqueta y sin códigos", () => {
    expect(confidenceLabel({ confidence: 0.924 })).toBe("92 %");
    expect(confidenceLabel({ confidence: null })).toBeNull();
    expect(
      signalLines([
        { kind: "conversion_offer", field: "body", phrase: "Si continúas…", reason: "Oferta." },
        { kind: "payment_details", field: "body", phrase: "Si continúas…", reason: "Pago." },
        { kind: "otp", field: "body", phrase: "Tu código", reason: "Código." },
        { kind: "promo_language", field: "body", phrase: "El futuro es conversacional", reason: "Tono." },
      ]),
    ).toEqual([
      { tag: "Oferta", phrase: "Si continúas…", reason: "Oferta." },
      { tag: "Tono", phrase: "El futuro es conversacional", reason: "Tono." },
    ]);
  });

  it("la propuesta conserva el ejemplo de cada variable que queda", () => {
    expect(remapExamples(["Ana", "Celucambio", "20 sept", "Crecimiento"], [1, 3, 2])).toEqual([
      "Ana",
      "20 sept",
      "Celucambio",
    ]);
  });
});
