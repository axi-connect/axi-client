import { buildEventLines, closedBy, describeConversationEvent, escalationSentence, handoffReason } from "../conversation-events"
import type { ConversationEvent } from "../inbox"

let seq = 0
const ev = (type: ConversationEvent["type"], at: string, over: Partial<ConversationEvent> = {}): ConversationEvent =>
  ({
    id: `e${String(++seq)}`,
    conversation_id: "c1",
    type,
    actor_type: "system",
    actor_user_id: null,
    payload: null,
    created_at: at,
    ...over,
  }) as ConversationEvent

describe("describeConversationEvent", () => {
  it("escalated: el motivo real del payload; uno desconocido cae a la frase genérica", () => {
    expect(describeConversationEvent(ev("escalated", "2026-09-26T14:28:00Z", { payload: { reason: "contact_requested_human" } }))?.text).toBe(
      "Axi pasó la conversación al equipo: el cliente pidió hablar con una persona",
    )
    expect(describeConversationEvent(ev("escalated", "2026-09-26T14:28:00Z", { payload: { reason: "algo_nuevo" } }))?.text).toBe(
      "Axi pasó la conversación al equipo",
    )
    expect(describeConversationEvent(ev("escalated", "2026-09-26T14:28:00Z"))?.tone).toBe("ai")
  })

  it("claimed / taken_over / returned_to_ai: tú, un nombre conocido o «el equipo» (nunca un nombre inventado)", () => {
    const claimed = ev("claimed", "2026-09-26T14:43:00Z", { actor_type: "user", actor_user_id: "me" })
    expect(describeConversationEvent(claimed, "me")?.text).toBe("Atendiste la conversación")
    expect(describeConversationEvent(claimed, "otro")?.text).toBe("El equipo atendió la conversación")
    expect(describeConversationEvent(claimed, "otro", { me: "Laura" })?.text).toBe("Laura atendió la conversación")
    const takeover = ev("taken_over", "2026-09-26T14:43:00Z", { actor_type: "user", actor_user_id: "me" })
    expect(describeConversationEvent(takeover, "me")?.text).toBe("Interviniste: Axi quedó en pausa")
    expect(describeConversationEvent(ev("taken_over", "2026-09-26T14:43:00Z", { payload: { via: "business_app" } }))?.text).toBe(
      "Respondieron desde el celular del negocio: Axi quedó en pausa",
    )
  })

  it("closed: Axi o una persona, resuelta o cerrada, con la razón solo si la escribió una persona", () => {
    expect(describeConversationEvent(ev("closed", "t", { actor_type: "ai_agent", payload: { status: "resolved", reason: "goal_met" } }))?.text).toBe(
      "Axi resolvió la conversación",
    )
    expect(describeConversationEvent(ev("closed", "t", { actor_type: "user", actor_user_id: "me", payload: { status: "closed", reason: "Spam" } }), "me")?.text).toBe(
      "Cerraste la conversación: Spam",
    )
  })

  it("sla_breached con y sin segundos; intent_detected no se pinta", () => {
    expect(describeConversationEvent(ev("sla_breached", "t", { payload: { sla_seconds: 300 } }))?.text).toBe("Superó los 5 min de espera en cola")
    expect(describeConversationEvent(ev("sla_breached", "t"))?.text).toBe("Superó el tiempo de espera en cola")
    expect(describeConversationEvent(ev("intent_detected", "t", { payload: { code: "x" } }))).toBeNull()
  })
})

describe("buildEventLines", () => {
  it("ordena ascendente (el servidor las da al revés) y cuelga la nota de su devolución", () => {
    const lines = buildEventLines(
      [
        ev("note_added", "2026-09-24T19:49:00.300Z", { payload: { note: "Ya se aprobó el reembolso", for_ai_history: true } }),
        ev("returned_to_ai", "2026-09-24T19:49:00.000Z", { actor_type: "user", actor_user_id: "me", payload: { has_note: true } }),
        ev("escalated", "2026-09-24T16:00:00Z", { payload: { reason: "tool" } }),
      ],
      "me",
    )
    expect(lines.map((line) => line.text)).toEqual([
      "Axi pasó la conversación al equipo: decidió que esta la atienda una persona",
      "Devolviste la conversación a Axi",
    ])
    expect(lines[1].note).toBe("Ya se aprobó el reembolso")
  })

  it("una nota para Axi lejos de cualquier devolución va como línea propia; una sin texto no se pinta", () => {
    const lines = buildEventLines([
      ev("returned_to_ai", "2026-09-24T10:00:00Z"),
      ev("note_added", "2026-09-24T12:00:00Z", { payload: { note: "Cliente VIP", for_ai_history: true } }),
      ev("note_added", "2026-09-24T12:01:00Z", { payload: { note: "  " } }),
    ])
    expect(lines).toHaveLength(2)
    expect(lines[0].note).toBeUndefined()
    expect(lines[1]).toMatchObject({ text: "Nota para Axi", note: "Cliente VIP" })
  })
})

describe("handoffReason / closedBy / escalationSentence", () => {
  it("el último escalamiento del episodio, con el SLA que venció después", () => {
    const reason = handoffReason([
      ev("escalated", "2026-09-26T14:28:00Z", { payload: { reason: "contact_requested_human" } }),
      ev("sla_breached", "2026-09-26T14:33:00Z", { payload: { sla_seconds: 300 } }),
    ])
    expect(reason).toEqual({ sentence: "El cliente pidió hablar con una persona.", at: "2026-09-26T14:28:00Z", slaMinutes: 5 })
  })

  it("si después la devolvieron a Axi, ese escalamiento ya no explica nada; sin escalamiento, nada", () => {
    expect(
      handoffReason([ev("escalated", "2026-09-26T10:00:00Z", { payload: { reason: "tool" } }), ev("returned_to_ai", "2026-09-26T11:00:00Z")]),
    ).toBeNull()
    expect(handoffReason([ev("claimed", "2026-09-26T11:00:00Z")])).toBeNull()
  })

  it("quién cerró: Axi, tú o el equipo; sin cierre, null", () => {
    expect(closedBy([ev("closed", "t", { actor_type: "ai_agent" })])).toBe("por Axi")
    expect(closedBy([ev("closed", "t", { actor_type: "user", actor_user_id: "me" })], "me")).toBe("por ti")
    expect(closedBy([ev("closed", "t", { actor_type: "user", actor_user_id: "u2" })], "me")).toBe("por el equipo")
    expect(closedBy([])).toBeNull()
  })

  it("frase del motivo: conocido y genérico", () => {
    expect(escalationSentence("ai_failures")).toBe("Axi no pudo responder varias veces seguidas.")
    expect(escalationSentence(null)).toBe("Axi pasó la conversación al equipo.")
  })
})
