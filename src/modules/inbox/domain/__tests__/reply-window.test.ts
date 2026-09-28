import { formatWindowSpan, OUTBOUND_WINDOW_HOURS, replyWindow, supportsTemplates } from "../reply-window"

const NOW = Date.parse("2026-09-27T15:00:00Z")
const H = 60 * 60 * 1000
const conv = (kind: Parameters<typeof replyWindow>[0]["channel"]["kind"], lastInbound: string | null) => ({
  channel: { kind },
  last_inbound_at: lastInbound,
})
const iso = (ms: number) => new Date(ms).toISOString()

describe("OUTBOUND_WINDOW_HOURS", () => {
  it("es la tabla exacta del servidor: tres kinds con 24 h, wweb sin ventana", () => {
    expect(OUTBOUND_WINDOW_HOURS).toEqual({ whatsapp_cloud: 24, instagram_dm: 24, facebook_messenger: 24 })
    expect(OUTBOUND_WINDOW_HOURS.whatsapp_web).toBeUndefined()
  })
  it("solo WhatsApp Cloud abre con plantilla", () => {
    expect(supportsTemplates("whatsapp_cloud")).toBe(true)
    expect(supportsTemplates("whatsapp_web")).toBe(false)
    expect(supportsTemplates("instagram_dm")).toBe(false)
    expect(supportsTemplates("facebook_messenger")).toBe(false)
  })
})

describe("replyWindow — los dos lados del borde", () => {
  it("dentro: hace 3 h, quedan 21 h", () => {
    expect(replyWindow(conv("whatsapp_cloud", iso(NOW - 3 * H)), NOW)).toEqual({ state: "open", remainingMs: 21 * H, soon: false })
  })
  it("justo en el borde (24 h exactas) sigue dentro, como el `<` estricto del servidor", () => {
    expect(replyWindow(conv("whatsapp_cloud", iso(NOW - 24 * H)), NOW)).toEqual({ state: "open", remainingMs: 0, soon: true })
  })
  it("un milisegundo después del borde ya está fuera", () => {
    expect(replyWindow(conv("whatsapp_cloud", iso(NOW - 24 * H - 1)), NOW)).toEqual({ state: "closed", closedAgoMs: 1, templates: true })
  })
  it("fuera hace 2 h en Cloud: se puede abrir con plantilla", () => {
    expect(replyWindow(conv("whatsapp_cloud", iso(NOW - 26 * H)), NOW)).toEqual({ state: "closed", closedAgoMs: 2 * H, templates: true })
  })
  it("por cerrar: menos de 1 h", () => {
    const w = replyWindow(conv("whatsapp_cloud", iso(NOW - 23 * H - 22 * 60_000)), NOW)
    expect(w).toEqual({ state: "open", remainingMs: 38 * 60_000, soon: true })
  })
  it("a 1 h exacta todavía no avisa", () => {
    expect(replyWindow(conv("whatsapp_cloud", iso(NOW - 23 * H)), NOW)).toMatchObject({ state: "open", soon: false })
  })
  it("null cuenta como fuera de ventana", () => {
    expect(replyWindow(conv("whatsapp_cloud", null), NOW)).toEqual({ state: "closed", closedAgoMs: null, templates: true })
    expect(replyWindow(conv("instagram_dm", null), NOW)).toEqual({ state: "closed", closedAgoMs: null, templates: false })
  })
  it("Instagram y Messenger fuera: cerrada y SIN plantillas", () => {
    expect(replyWindow(conv("instagram_dm", iso(NOW - 30 * H)), NOW)).toEqual({ state: "closed", closedAgoMs: 6 * H, templates: false })
    expect(replyWindow(conv("facebook_messenger", iso(NOW - 30 * H)), NOW)).toMatchObject({ state: "closed", templates: false })
  })
  it("Instagram dentro: abierta", () => {
    expect(replyWindow(conv("instagram_dm", iso(NOW - 1 * H)), NOW)).toMatchObject({ state: "open" })
  })
  it("WhatsApp Web no tiene ventana, ni con un inbound de hace una semana ni sin inbound", () => {
    expect(replyWindow(conv("whatsapp_web", iso(NOW - 24 * 7 * H)), NOW)).toEqual({ state: "none" })
    expect(replyWindow(conv("whatsapp_web", null), NOW)).toEqual({ state: "none" })
  })
})

describe("formatWindowSpan", () => {
  it("redondea hacia abajo y nunca promete de más", () => {
    expect(formatWindowSpan(21 * H + 59 * 60_000)).toBe("21 h")
    expect(formatWindowSpan(38 * 60_000 + 59_000)).toBe("38 min")
    expect(formatWindowSpan(30_000)).toBe("menos de 1 min")
    expect(formatWindowSpan(26 * H)).toBe("1 día")
    expect(formatWindowSpan(50 * H)).toBe("2 días")
  })
})
