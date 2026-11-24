import {
  emailWhy,
  matchesFilter,
  matchesQuery,
  pips,
  rowSubtitle,
  sequenceLine,
  whatsappWhy,
  type TrackingRowDTO,
} from "../sequence-tracking"

const T0 = "2026-11-23T13:00:00.000Z"
const when = (iso: string) => `[${iso.slice(11, 16)}]`

function row(overrides: Partial<TrackingRowDTO> = {}): TrackingRowDTO {
  return {
    contact_id: "c1",
    name: "Viajes Brisa Sur",
    category: "Agencia de viajes",
    city: "Bogotá",
    search_id: "s1",
    replied: false,
    undelivered_in_chat: 0,
    whatsapp: { state: "delivered", detail: null, at: T0, conversation_id: "v1", undelivered_in_chat: false },
    email: {
      state: "delivered",
      detail: null,
      at: T0,
      subject: "Una idea",
      opened_at: null,
      open_count: 0,
      clicked_at: null,
      click_count: 0,
    },
    sequence: { status: "active", stop_reason: null, current_position: 2, steps: 4, next: null },
    ...overrides,
  }
}

describe("Seguimiento de la secuencia · reglas de la vista", () => {
  it("los filtros: respondieron, con interés (leyó, abrió o dio clic), no llegó y en curso", () => {
    const replied = row({ replied: true })
    const opened = row({ email: { ...row().email!, opened_at: T0, open_count: 1 } })
    const failed = row({ whatsapp: { ...row().whatsapp!, state: "failed", detail: "el número no pudo recibir el mensaje" } })
    const bounced = row({ email: { ...row().email!, state: "bounced" } })
    const done = row({ sequence: { ...row().sequence, status: "completed" } })

    expect(matchesFilter(replied, "replied")).toBe(true)
    expect(matchesFilter(opened, "interest")).toBe(true)
    // Si ya respondió, no cuenta como «con interés»: ya está en «Respondieron»
    expect(matchesFilter({ ...opened, replied: true }, "interest")).toBe(false)
    expect(matchesFilter(failed, "failed")).toBe(true)
    expect(matchesFilter(bounced, "failed")).toBe(true)
    expect(matchesFilter(row(), "ongoing")).toBe(true)
    expect(matchesFilter(done, "ongoing")).toBe(false)
  })

  it("busca por nombre, categoría o ciudad sin tildes ni mayúsculas", () => {
    expect(matchesQuery(row(), "bogota")).toBe(true)
    expect(matchesQuery(row(), "AGENCIA")).toBe(true)
    expect(matchesQuery(row(), "hotel")).toBe(false)
    expect(rowSubtitle(row({ city: null }))).toBe("Agencia de viajes")
  })

  it("la línea del WhatsApp dice el motivo del fallo como frase, o cuándo sale", () => {
    expect(
      whatsappWhy({ ...row().whatsapp!, state: "failed", detail: "el número no pudo recibir el mensaje." }, when),
    ).toBe("El número no pudo recibir el mensaje")
    expect(whatsappWhy({ ...row().whatsapp!, state: "scheduled" }, when)).toBe("Sale [13:00]")
  })

  it("la línea del correo pone primero el clic, luego las aperturas, y explica el rebote", () => {
    const base = row().email!
    expect(emailWhy({ ...base, click_count: 1, clicked_at: T0, open_count: 2 }, when)).toBe(
      "Abrió y dio clic · [13:00]",
    )
    expect(emailWhy({ ...base, open_count: 2, opened_at: T0 }, when)).toBe("Abrió 2 veces · [13:00]")
    expect(emailWhy(base, when)).toBe("Sin abrir")
    expect(emailWhy({ ...base, state: "bounced" }, when)).toContain("no se le vuelve a escribir")
  })

  it("la columna de la secuencia: paso, qué sigue o por qué paró", () => {
    expect(sequenceLine(row({ sequence: { ...row().sequence, next: { medium: "call", at: T0 } } }), when)).toEqual({
      main: "Paso 2 de 4",
      sub: "Llamada · [13:00]",
    })
    expect(
      sequenceLine(row({ sequence: { ...row().sequence, status: "stopped", stop_reason: "replied" } }), when).main,
    ).toBe("Parada: respondió")
  })

  it("los puntos de avance: un fallo marca el primero en rojo", () => {
    expect(pips(3, false)).toEqual(["on", "on", "on", "off"])
    expect(pips(1, true)).toEqual(["x", "off", "off", "off"])
  })
})
