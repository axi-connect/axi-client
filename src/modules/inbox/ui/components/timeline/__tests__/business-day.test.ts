import { businessDayLabel, dayKeyIn } from "../business-day"

const BOGOTA = "America/Bogota"

describe("businessDayLabel / dayKeyIn", () => {
  it("medianoche del negocio por los dos lados: 11:30 p. m. es «Ayer» apenas pasa la medianoche de Bogotá", () => {
    const key = dayKeyIn(BOGOTA)
    // 26 sep 11:30 p. m. Bogotá = 27 sep 04:30Z
    const lateNight = key("2026-09-27T04:30:00Z")
    expect(lateNight).toBe("2026-09-26")
    // Mirado a las 11:45 p. m. del 26 (Bogotá): hoy.
    expect(businessDayLabel(lateNight, Date.parse("2026-09-27T04:45:00Z"), BOGOTA)).toBe("Hoy")
    // Mirado a las 12:30 a. m. del 27 (Bogotá): ayer, aunque en UTC sea el mismo día.
    expect(businessDayLabel(lateNight, Date.parse("2026-09-27T05:30:00Z"), BOGOTA)).toBe("Ayer")
  })

  it("días anteriores con nombre; otro año con el año; clave inválida, vacío", () => {
    const now = Date.parse("2026-09-26T15:00:00Z")
    expect(businessDayLabel("2026-09-24", now, BOGOTA)).toBe("Jueves 24 de septiembre")
    expect(businessDayLabel("2025-03-10", now, BOGOTA)).toBe("10 de marzo de 2025")
    expect(businessDayLabel("", now, BOGOTA)).toBe("")
    expect(dayKeyIn(BOGOTA)("nope")).toBe("")
  })
})
