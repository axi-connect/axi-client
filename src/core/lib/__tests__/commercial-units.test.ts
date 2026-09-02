import { formatAllowance, formatInteger, formatQuantity, unitLabel } from "../commercial-units"

describe("commercial-units", () => {
  it("concuerda la unidad en singular y plural", () => {
    expect(unitLabel("calls", 1)).toBe("llamada")
    expect(unitLabel("calls", 60)).toBe("llamadas")
    expect(unitLabel("verified_leads", 150)).toBe("leads verificados")
    expect(unitLabel("copilot_actions", 1)).toBe("acción del copiloto")
  })

  it("separa los miles como es-CO y sin decimales", () => {
    expect(formatInteger(2000)).toBe("2.000")
    expect(formatInteger(300)).toBe("300")
    expect(formatQuantity(2000, "contacts")).toBe("2.000 contactos")
  })

  it("compone la cuota con su equivalencia usando ≈", () => {
    expect(
      formatAllowance({
        quantity: 200,
        unit: "minutes",
        equivalent: { quantity: 60, unit: "calls" },
      }),
    ).toBe("200 minutos ≈ 60 llamadas")
  })

  it("sin equivalencia devuelve solo la cuota", () => {
    expect(formatAllowance({ quantity: 500, unit: "conversations" })).toBe("500 conversaciones")
  })
})
