import { initialLook, lookPayload, resultText, whatsappBody } from "../search-outreach"

describe("«Escribirles» (B2)", () => {
  it("abre con el look de la secuencia; sin imagen, la del nicho de la búsqueda", () => {
    expect(initialLook(null, "nicho:hoteles")).toEqual({
      image_id: "nicho:hoteles",
      personalize: false,
      email_design: "brand",
      cta: { label: "Quiero la prueba gratis", target: "reply" },
    })
    expect(
      initialLook(
        {
          image: { id: "nicho:ropa", personalize: true },
          email_design: "text",
          cta: null,
          whatsapp: null,
        },
        "nicho:hoteles",
      ),
    ).toMatchObject({ image_id: "nicho:ropa", personalize: true, email_design: "text" })
  })

  it("el botón solo viaja con el diseño «marca»", () => {
    const look = { image_id: "nicho:hoteles", personalize: true, email_design: "text" as const, cta: { label: "x", target: "reply" as const } }
    expect(lookPayload(look)).toEqual({ image: { id: "nicho:hoteles", personalize: true }, email_design: "text", cta: null })
    expect(lookPayload({ ...look, image_id: null, email_design: "brand" })).toEqual({
      image: null,
      email_design: "brand",
      cta: { label: "x", target: "reply" },
    })
  })

  it("el WhatsApp con los datos del negocio de ejemplo", () => {
    expect(
      whatsappBody("Ayudamos a hoteles como {{1}} a vender. Sobre {{2}}: {{3}}", ["company_name", "topic", "static:hoy"], {
        business: "Casa Almendro Hotel",
        topic: "reservas directas",
      }),
    ).toBe("Ayudamos a hoteles como Casa Almendro Hotel a vender. Sobre reservas directas: hoy")
  })

  it("el resultado dice cuántos entraron y por qué no los demás", () => {
    expect(resultText({ leads: 38, promoted: 38, enrolled: 36, skipped: { opted_out: 2 } })).toBe(
      "Inscribiste 36 de 38 negocios. No entraron: 2 se dieron de baja.",
    )
    expect(resultText({ leads: 5, promoted: 5, enrolled: 5, skipped: {} })).toBe("Inscribiste 5 de 5 negocios.")
  })
})
