import { PILL_MAX, splitTitle, toSileoOptions, TONE_DURATION_MS, TONE_TITLE } from "../to-options"

const ids = () => {
  let n = 0
  return () => `axi-${++n}`
}

describe("splitTitle", () => {
  it("deja intacto un título que cabe en la píldora", () => {
    expect(splitTitle("success", "Contacto eliminado")).toEqual({ title: "Contacto eliminado", description: undefined })
  })

  it("acepta justo el máximo", () => {
    const title = "Falta confirmar el PIN del número"
    expect(title.length).toBeLessThanOrEqual(PILL_MAX)
    expect(splitTitle("warning", title).title).toBe(title)
  })

  it("parte «cabeza: cola» y capitaliza la cola", () => {
    expect(splitTitle("success", "Tarea encolada: el agente la ejecutará en breve")).toEqual({
      title: "Tarea encolada",
      description: "El agente la ejecutará en breve",
    })
  })

  it("parte «cabeza — cola»", () => {
    expect(splitTitle("info", "Exportación iniciada — esta descarga queda auditada")).toEqual({
      title: "Exportación iniciada",
      description: "Esta descarga queda auditada",
    })
  })

  it("sin cabeza utilizable toma el título del tono y baja todo al cuerpo", () => {
    const server = "El teléfono +57 310 555 0142 ya pertenece a otro contacto de este tenant"
    expect(splitTitle("error", server)).toEqual({ title: TONE_TITLE.error, description: server })
  })

  it("no parte por un guion pegado dentro de una palabra", () => {
    const title = "La conversación de ese contacto ya tiene una oportunidad abierta"
    expect(splitTitle("error", title).title).toBe(TONE_TITLE.error)
  })

  it("antepone la cola a la descripción original con un punto", () => {
    expect(
      splitTitle("error", "No se pudo guardar: el correo ya está en otro contacto", "Revisa el correo."),
    ).toEqual({ title: "No se pudo guardar", description: "El correo ya está en otro contacto. Revisa el correo." })
  })

  it("no duplica el punto si la cola ya termina en puntuación", () => {
    const server = "El número de WhatsApp aún no está verificado en Meta."
    expect(splitTitle("error", server, "Vuelve a intentarlo.").description).toBe(
      "El número de WhatsApp aún no está verificado en Meta. Vuelve a intentarlo.",
    )
  })
})

describe("toSileoOptions", () => {
  it("usa la duración del tono", () => {
    expect(toSileoOptions({ tone: "success", title: "Guardado" }, ids()).duration).toBe(TONE_DURATION_MS.success)
    expect(toSileoOptions({ tone: "error", title: "Falló" }, ids()).duration).toBe(TONE_DURATION_MS.error)
  })

  it("respeta el autoCloseMs del llamador, con un mínimo de 1 s", () => {
    expect(toSileoOptions({ tone: "success", title: "Guardado", autoCloseMs: 9000 }, ids()).duration).toBe(9000)
    expect(toSileoOptions({ tone: "success", title: "Guardado", autoCloseMs: 200 }, ids()).duration).toBe(1000)
  })

  it("con botón no se cierra sola y lleva el primer botón", () => {
    const onClick = jest.fn()
    const opts = toSileoOptions(
      { tone: "error", title: "Nueva alerta", actions: [{ label: "Ver", onClick }, { label: "Otro", onClick }] },
      ids(),
    )
    expect(opts.duration).toBeNull()
    expect(opts.button).toEqual({ title: "Ver", onClick })
  })

  it("éxito e info comparten ranura: sin id", () => {
    expect(toSileoOptions({ tone: "success", title: "Guardado" }, ids())).not.toHaveProperty("id")
    expect(toSileoOptions({ tone: "info", title: "Provisión iniciada" }, ids())).not.toHaveProperty("id")
  })

  it("error y advertencia se apilan: un id distinto cada vez", () => {
    const next = ids()
    const a = toSileoOptions({ tone: "error", title: "Falló" }, next)
    const b = toSileoOptions({ tone: "warning", title: "Atención" }, next)
    expect(a.id).toBe("axi-1")
    expect(b.id).toBe("axi-2")
  })

  it("no emite description vacía", () => {
    expect(toSileoOptions({ tone: "success", title: "Guardado" }, ids())).not.toHaveProperty("description")
  })
})
