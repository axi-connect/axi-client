import {
  elapsedShort,
  formatClockTime,
  formatConversationTime,
  formatDayLabel,
  formatFullDateTime,
  localDateToIso,
  localDayKey,
} from "../day-label"

// Constructor LOCAL a propósito: las comparaciones son por día calendario local,
// así el test no depende de la zona horaria de la máquina de CI.
const NOW = new Date(2026, 8, 10, 15, 0) // jueves 10 de septiembre de 2026, 15:00
const at = (y: number, m: number, d: number, h = 9, min = 5) => new Date(y, m - 1, d, h, min).toISOString()

describe("formatConversationTime (fila de la lista, patrón WhatsApp)", () => {
  it("hoy → hora 24 h", () => {
    expect(formatConversationTime(at(2026, 9, 10, 14, 32), NOW)).toBe("14:32")
    expect(formatConversationTime(at(2026, 9, 10, 0, 5), NOW)).toBe("00:05")
  })
  it("ayer → Ayer, aunque hayan pasado pocas horas", () => {
    expect(formatConversationTime(at(2026, 9, 9, 23, 50), NOW)).toBe("Ayer")
  })
  it("menos de 7 días → día de la semana con mayúscula", () => {
    expect(formatConversationTime(at(2026, 9, 7), NOW)).toBe("Lunes")
    expect(formatConversationTime(at(2026, 9, 4), NOW)).toBe("Viernes")
  })
  it("7 días o más → dd/mm/aa", () => {
    expect(formatConversationTime(at(2026, 9, 3), NOW)).toBe("03/09/26")
    expect(formatConversationTime(at(2026, 3, 10), NOW)).toBe("10/03/26")
  })
  it("futuro (reloj desfasado) se trata como hoy; inválida → cadena vacía", () => {
    expect(formatConversationTime(at(2026, 9, 11, 8, 0), NOW)).toBe("08:00")
    expect(formatConversationTime("nope", NOW)).toBe("")
  })
})

describe("formatDayLabel (separador de día)", () => {
  it("largo: Hoy / Ayer / día y mes sin coma / con año si es otro", () => {
    expect(formatDayLabel("2026-09-10", NOW)).toBe("Hoy")
    expect(formatDayLabel("2026-09-09", NOW)).toBe("Ayer")
    expect(formatDayLabel("2026-09-07", NOW)).toBe("Lunes 7 de septiembre")
    expect(formatDayLabel("2026-03-10", NOW)).toBe("Martes 10 de marzo")
    expect(formatDayLabel("2025-03-10", NOW)).toBe("10 de marzo de 2025")
  })
  it("corto: para grupos compactos (adjuntos)", () => {
    expect(formatDayLabel("2026-09-10", NOW, "short")).toBe("Hoy")
    expect(formatDayLabel("2026-09-07", NOW, "short")).toMatch(/^7 (de )?sept?\.?$/)
    expect(formatDayLabel("2025-03-10", NOW, "short")).toMatch(/^10 (de )?mar\.?(,| de)? 2025$/)
  })
  it("acepta un ISO completo y devuelve vacío si es inválido", () => {
    expect(formatDayLabel(at(2026, 9, 9, 1, 0), NOW)).toBe("Ayer")
    expect(formatDayLabel("zzz", NOW)).toBe("")
  })
})

describe("localDayKey / formatClockTime / formatFullDateTime", () => {
  it("la clave es el día LOCAL, estable alrededor de medianoche", () => {
    expect(localDayKey(at(2026, 9, 9, 23, 59))).toBe("2026-09-09")
    expect(localDayKey(at(2026, 9, 10, 0, 0))).toBe("2026-09-10")
    expect(localDayKey("bad")).toBe("")
  })
  it("hora 24 h y fecha completa legible", () => {
    expect(formatClockTime(at(2026, 9, 10, 14, 32))).toBe("14:32")
    expect(formatFullDateTime(at(2026, 9, 10, 14, 32))).toMatch(/10 de septiembre de 2026/)
    expect(formatFullDateTime(at(2026, 9, 10, 14, 32))).toMatch(/14:32/)
  })
})

describe("elapsedShort", () => {
  it("ahora / min / h / d", () => {
    expect(elapsedShort(at(2026, 9, 10, 14, 59), NOW)).toBe("1 min")
    expect(elapsedShort(at(2026, 9, 10, 15, 0), NOW)).toBe("ahora")
    expect(elapsedShort(at(2026, 9, 10, 12, 0), NOW)).toBe("3 h")
    expect(elapsedShort(at(2026, 9, 7, 15, 0), NOW)).toBe("3 d")
    expect(elapsedShort("bad", NOW)).toBe("")
  })
})

describe("localDateToIso", () => {
  it("medianoche local del día y límite exclusivo con plusDays", () => {
    expect(localDateToIso("2026-09-01")).toBe(new Date(2026, 8, 1).toISOString())
    expect(localDateToIso("2026-09-10", { plusDays: 1 })).toBe(new Date(2026, 8, 11).toISOString())
    expect(localDateToIso("")).toBeUndefined()
    expect(localDateToIso("10/09/2026")).toBeUndefined()
  })
})
