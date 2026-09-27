import { businessDayKey } from "@/core/lib/business-time"
import { buildTimeline } from "../build-timeline"
import type { UiMessage } from "@/modules/inbox/domain/inbox"
import type { EventLine } from "@/modules/inbox/domain/conversation-events"

const BOGOTA = "America/Bogota"
const dayKey = (iso: string) => (Number.isNaN(Date.parse(iso)) ? "" : businessDayKey(iso, BOGOTA))

const msg = (id: string, created_at: string, over: Partial<UiMessage> = {}): UiMessage =>
  ({ id, created_at, direction: "inbound", sender_type: "contact", sender_user_id: null, content_type: "text", payload: null, ...over }) as UiMessage
const line = (id: string, at: string): EventLine => ({ id, at, tone: "ai", text: id })

describe("buildTimeline", () => {
  it("intercala por hora; a igual hora el mensaje va antes que el evento que causó", () => {
    const days = buildTimeline(
      [msg("m1", "2026-09-26T14:14:00Z"), msg("m2", "2026-09-26T14:28:00Z")],
      [line("escalated", "2026-09-26T14:28:00Z"), line("sla", "2026-09-26T14:33:00Z")],
      { hasOlder: false, dayKey },
    )
    expect(days).toHaveLength(1)
    expect(days[0].items.map((item) => item.key)).toEqual(["m1", "m2", "e:escalated", "e:sla"])
  })

  it("agrupa al mismo autor a menos de 5 min; otro autor, un evento o 5 min cortan el grupo", () => {
    const axi = { direction: "outbound", sender_type: "ai_agent" } as const
    const days = buildTimeline(
      [
        msg("a1", "2026-09-26T14:15:00Z", axi),
        msg("a2", "2026-09-26T14:15:30Z", axi),
        msg("c1", "2026-09-26T14:16:00Z"),
        msg("a3", "2026-09-26T14:17:00Z", axi),
        msg("a4", "2026-09-26T14:17:20Z", axi),
        msg("a5", "2026-09-26T14:30:00Z", axi),
      ],
      [line("ev", "2026-09-26T14:17:10Z")],
      { hasOlder: false, dayKey },
    )
    const flags = days[0].items.map((item) => (item.kind === "message" ? `${item.key}:${item.first ? "F" : ""}${item.last ? "L" : ""}` : item.key))
    expect(flags).toEqual(["a1:F", "a2:L", "c1:FL", "a3:FL", "e:ev", "a4:FL", "a5:FL"])
  })

  it("lo que salió del celular del negocio no se agrupa con lo escrito en Axi", () => {
    const me = { direction: "outbound", sender_type: "user", sender_user_id: "u1" } as const
    const days = buildTimeline(
      [msg("x", "2026-09-26T14:15:00Z", me), msg("y", "2026-09-26T14:15:10Z", { ...me, payload: { origin: "business_app" } })],
      [],
      { hasOlder: false, dayKey },
    )
    expect(days[0].items.every((item) => item.kind === "message" && item.first && item.last)).toBe(true)
  })

  it("el día es el del NEGOCIO: 11:30 p. m. y 12:30 a. m. de Bogotá caen en días distintos (UTC diría el mismo)", () => {
    // 04:30Z y 05:30Z del 27 son el 26 a las 11:30 p. m. y el 27 a las 12:30 a. m. en Bogotá.
    const days = buildTimeline([msg("antes", "2026-09-27T04:30:00Z"), msg("despues", "2026-09-27T05:30:00Z")], [], { hasOlder: false, dayKey })
    expect(days.map((day) => day.key)).toEqual(["2026-09-26", "2026-09-27"])
  })

  it("con historial sin cargar, los eventos anteriores al primer mensaje esperan al scroll-up", () => {
    const messages = [msg("m1", "2026-09-26T14:14:00Z")]
    const lines = [line("viejo", "2026-09-20T10:00:00Z"), line("nuevo", "2026-09-26T14:20:00Z")]
    expect(buildTimeline(messages, lines, { hasOlder: true, dayKey }).flatMap((d) => d.items.map((i) => i.key))).toEqual(["m1", "e:nuevo"])
    expect(buildTimeline(messages, lines, { hasOlder: false, dayKey }).flatMap((d) => d.items.map((i) => i.key))).toEqual(["e:viejo", "m1", "e:nuevo"])
  })

  it("vacío ⇒ sin días; una fecha inválida cae en el día anterior", () => {
    expect(buildTimeline([], [], { hasOlder: false, dayKey })).toEqual([])
    const days = buildTimeline([msg("a", "2026-09-26T14:00:00Z"), msg("b", "nope")], [], { hasOlder: false, dayKey })
    expect(days).toHaveLength(1)
    expect(days[0].items).toHaveLength(2)
  })
})
