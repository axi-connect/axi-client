import {
  initialLook,
  lookChanged,
  lookPayload,
  personalizedName,
  resultText,
  sampleOrder,
  templateDisplayName,
  whatsappBody,
} from "../search-outreach"

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
    expect(resultText({ leads: 38, promoted: 38, enrolled: 36, look_changed: true, skipped: { opted_out: 2 } } as never)).toBe(
      "Inscribiste 36 de 38 negocios. No entraron: 2 se dieron de baja.",
    )
    expect(resultText({ leads: 5, promoted: 5, enrolled: 5, look_changed: false, skipped: {} } as never)).toBe("Inscribiste 5 de 5 negocios.")
  })

  it("sabe si el look cambia el de la secuencia", () => {
    const view = { image: { id: "nicho:hoteles", personalize: false }, email_design: "brand" as const, cta: null, whatsapp: null } as never
    expect(lookChanged(initialLook(view, "nicho:ropa"), view)).toBe(false)
    expect(lookChanged({ ...initialLook(view, null), personalize: true }, view)).toBe(true)
  })

  it("nombres legibles: plantilla, nombre sobre la imagen y «Ver como» de corto a largo", () => {
    expect(templateDisplayName("axi_prospeccion_hoteles_v2")).toBe("Prospección hoteles · v2")
    expect(personalizedName("Glamping Islas del Rosario Eco Lodge & Beach Club Resort")).toBe(
      "Glamping Islas del Rosario Eco Lodge &",
    )
    expect(sampleOrder(["Hotel Boutique Casa del Mar", "Nácar", "Casa Almendro"])).toEqual([
      "Nácar",
      "Casa Almendro",
      "Hotel Boutique Casa del Mar",
    ])
  })
})
