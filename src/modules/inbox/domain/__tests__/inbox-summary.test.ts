import {
  daySlots,
  firstNameOf,
  openSplit,
  queueNextUp,
  resolvedSplit,
  viewSubtitle,
  waitingPhrase,
} from "../inbox-summary"
import type { InboxCounts } from "../inbox"

const counts = (overrides: Partial<InboxCounts> = {}): InboxCounts => ({
  queued: 3,
  mine: 5,
  ai: 12,
  all_open: 24,
  unread_total: 7,
  ...overrides,
})

describe("waitingPhrase", () => {
  it("singular, plural y nadie", () => {
    expect(waitingPhrase(1)).toBe("1 espera")
    expect(waitingPhrase(3)).toBe("3 esperan")
    expect(waitingPhrase(0)).toBe("Nadie espera")
    expect(waitingPhrase(-2)).toBe("Nadie espera")
  })
})

describe("queueNextUp", () => {
  const head = { name: "Mariana Restrepo Villegas", channel: "WhatsApp Ventas", since: "hace 14 min" }

  it("con cola: cuántos esperan, quién más lleva y el primer nombre para el botón", () => {
    expect(queueNextUp(3, head, 12)).toEqual({
      queued: 3,
      headline: "3 esperan",
      line: "La que más lleva: Mariana Restrepo Villegas · WhatsApp Ventas · hace 14 min.",
      firstName: "Mariana",
    })
  })

  it("una sola: «Es …», no «la que más lleva»", () => {
    expect(queueNextUp(1, head, 0).line).toBe("Es Mariana Restrepo Villegas · WhatsApp Ventas · hace 14 min.")
  })

  it("sin queued_at: la frase no inventa el tiempo", () => {
    expect(queueNextUp(2, { ...head, since: null }, 0).line).toBe(
      "La que más lleva: Mariana Restrepo Villegas · WhatsApp Ventas.",
    )
  })

  it("sin cola: dice qué hace Axi, sin botón (los dos signos: con y sin Axi atendiendo)", () => {
    const withAi = queueNextUp(0, null, 12)
    expect(withAi.headline).toBe("Nadie espera")
    expect(withAi.firstName).toBeNull()
    expect(withAi.line).toBe("Axi atiende 12 conversaciones. Si pasa una al equipo, la verás aquí.")
    expect(queueNextUp(0, null, 1).line).toMatch(/^Axi atiende 1 conversación\./)
    expect(queueNextUp(0, null, 0).line).toMatch(/^Axi responde apenas alguien escriba/)
  })

  it("el conteo dice que hay cola pero la cabeza aún no llegó: se trata como sin cola", () => {
    expect(queueNextUp(2, null, 4).firstName).toBeNull()
  })
})

describe("firstNameOf", () => {
  it("primera palabra; un nombre de empresa sin espacios queda entero", () => {
    expect(firstNameOf("  Mariana Restrepo ")).toBe("Mariana")
    expect(firstNameOf("+573001234567")).toBe("+573001234567")
  })
})

describe("viewSubtitle", () => {
  it("En cola: con y sin la antigüedad de la cabeza, y vacía", () => {
    expect(viewSubtitle("queued", counts(), "hace 14 min")).toBe("3 esperan · la más antigua hace 14 min")
    expect(viewSubtitle("queued", counts(), null)).toBe("3 esperan")
    expect(viewSubtitle("queued", counts({ queued: 0 }), null)).toBe("Nadie espera")
  })

  it("Todas abiertas: el reparto suma al total (24 = 12 Axi + 9 equipo + 3 cola)", () => {
    expect(viewSubtitle("all_open", counts(), null)).toBe("24 abiertas · 12 con Axi, 9 con el equipo, 3 en cola")
  })

  it("Contigo, Axi y Cerradas; sin conteos todavía no dice nada (salvo Cerradas)", () => {
    expect(viewSubtitle("mine", counts(), null)).toBe("5 contigo")
    expect(viewSubtitle("mine", counts({ mine: 0 }), null)).toBe("Ninguna asignada a ti")
    expect(viewSubtitle("ai", counts(), null)).toBe("12 con Axi · puedes intervenir en cualquiera")
    expect(viewSubtitle("closed", null, null)).toBe("Solo lectura · el historial se consulta, no se continúa")
    expect(viewSubtitle("queued", null, null)).toBeNull()
  })
})

describe("openSplit / resolvedSplit", () => {
  it("el equipo es el resto de las abiertas y nunca baja de cero", () => {
    expect(openSplit(counts())).toEqual({ ai: 12, team: 9, queued: 3 })
    expect(openSplit(counts({ all_open: 10, ai: 8, queued: 5 })).team).toBe(0)
  })

  it("resueltas: cifras enteras que suman el total, en los dos extremos", () => {
    expect(resolvedSplit(31, 74.2)).toEqual({ ai: 23, team: 8, aiPct: 74, teamPct: 26 })
    expect(resolvedSplit(4, 100)).toEqual({ ai: 4, team: 0, aiPct: 100, teamPct: 0 })
    expect(resolvedSplit(4, 0)).toEqual({ ai: 0, team: 4, aiPct: 0, teamPct: 100 })
    expect(resolvedSplit(0, 50)).toEqual({ ai: 0, team: 0, aiPct: 0, teamPct: 0 })
  })
})

describe("daySlots", () => {
  it("24 horas: las corridas con su valor, la actual marcada y las que faltan vacías", () => {
    const slots = daySlots([{ hour: 8, value: 6 }, { hour: 9, value: 3 }], 9)
    expect(slots).toHaveLength(24)
    expect(slots[8]).toEqual({ hour: 8, value: 6, ratio: 1, state: "past" })
    expect(slots[9]).toEqual({ hour: 9, value: 3, ratio: 0.5, state: "now" })
    expect(slots[10].state).toBe("future")
    expect(slots[0].state).toBe("past")
  })

  it("dos buckets de la misma hora (cambio de horario) se suman; fuera de rango se ignora", () => {
    const slots = daySlots([{ hour: 2, value: 1 }, { hour: 2, value: 2 }, { hour: 24, value: 9 }, { hour: -1, value: 9 }], 23)
    expect(slots[2].value).toBe(3)
    expect(slots.reduce((sum, slot) => sum + slot.value, 0)).toBe(3)
  })

  it("día sin movimiento: todo en cero y sin dividir por cero", () => {
    expect(daySlots([], 0).every((slot) => slot.ratio === 0)).toBe(true)
  })
})
