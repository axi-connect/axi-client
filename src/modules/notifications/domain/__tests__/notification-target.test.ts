import { notificationTarget } from "../notification-target"

describe("notificationTarget", () => {
  it("resuelve la familia conversation.* al inbox de la conversación", () => {
    expect(
      notificationTarget("conversation.queued", { conversation_id: "abc-123" }),
    ).toBe("/workspace/inbox/abc-123")
    expect(
      notificationTarget("conversation.sla_breached", { conversation_id: "def-456" }),
    ).toBe("/workspace/inbox/def-456")
  })

  it("devuelve null si conversation.* no trae conversation_id", () => {
    expect(notificationTarget("conversation.queued", {})).toBeNull()
    expect(notificationTarget("conversation.queued", { conversation_id: 42 })).toBeNull()
  })

  it("resuelve la familia order.* al detalle del panel de pedidos (F11)", () => {
    expect(notificationTarget("order.created", { order_id: "o1", number: 7 })).toBe("/orders/o1")
    expect(notificationTarget("order.payment_reported", { order_id: "o1" })).toBe("/orders/o1")
    // Sin order_id: al panel general, nunca null (la vista ya existe)
    expect(notificationTarget("order.created", {})).toBe("/orders")
  })

  it("devuelve null para tipos desconocidos y data no-objeto", () => {
    expect(notificationTarget("usage.threshold", { metric: "messages" })).toBeNull()
    expect(notificationTarget("conversation.queued", null)).toBeNull()
    expect(notificationTarget("conversation.queued", "texto")).toBeNull()
  })
})
