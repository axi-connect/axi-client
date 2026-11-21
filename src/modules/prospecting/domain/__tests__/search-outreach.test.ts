import {
  initialLook,
  lookChanged,
  lookPayload,
  personalizedName,
  previewEmailStep,
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

  it("el WhatsApp con los mismos valores que arma el servidor al enviar", () => {
    expect(
      whatsappBody(
        "Hola {{1}}, te escribe {{2}}: ayudamos a hoteles como {{3}}. Sobre {{4}}: {{5}}",
        ["first_name", "company_name", "full_name", "topic", "static:hoy"],
        { business: "Casa Almendro Hotel", topic: "reservas directas", sender: "Axi Connect" },
      ),
    ).toBe("Hola Casa, te escribe Axi Connect: ayudamos a hoteles como Casa Almendro Hotel. Sobre reservas directas: hoy")
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
      "Glamping Islas del Rosario Eco Lodge",
    )
    expect(sampleOrder(["Hotel Boutique Casa del Mar", "Nácar", "Casa Almendro"])).toEqual([
      "Nácar",
      "Casa Almendro",
      "Hotel Boutique Casa del Mar",
    ])
  })

  it("la vista previa del correo: con marca, el primero que la lleva (el 1 va en texto)", () => {
    const steps = [
      { task_channel: "email", message_template: { subject: "una idea", body: "1" } },
      { task_channel: "email", message_template: { subject: "Re: una idea", body: "re" } },
      { task_channel: "email", message_template: { subject: "antes de la temporada", body: "3" } },
    ]
    expect(previewEmailStep(steps, "brand")).toEqual({
      step: { subject: "antes de la temporada", body: "3" },
      brand: true,
      position: 2,
      day: 0,
    })
    expect(
      previewEmailStep(
        steps.map((step, i) => ({ ...step, offset_hours: [0, 72, 192][i] })),
        "brand",
      )?.day,
    ).toBe(8)
    expect(previewEmailStep(steps, "text")).toMatchObject({ step: { subject: "una idea" }, brand: false, position: 1 })
    expect(previewEmailStep(steps.slice(0, 2), "brand")).toMatchObject({ brand: false, position: 1 })
  })
})
