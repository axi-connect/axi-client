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

  it("resuelve crm.deal_* al rail del board (CRM F0)", () => {
    expect(notificationTarget("crm.deal_created", { deal_id: "d1" })).toBe(
      "/crm/pipeline/deal/d1",
    )
    expect(notificationTarget("crm.deal_stalled", { deal_id: "d2" })).toBe(
      "/crm/pipeline/deal/d2",
    )
    // Sin deal_id: al board general, nunca null
    expect(notificationTarget("crm.deal_won", {})).toBe("/crm/pipeline")
  })

  it("resuelve crm.task_* a la bandeja y crm.import_* al historial", () => {
    expect(notificationTarget("crm.task_due", { activity_id: "a1" })).toBe("/crm/tasks")
    expect(notificationTarget("crm.task_assigned", {})).toBe("/crm/tasks")
    expect(notificationTarget("crm.import_completed", { import_job_id: "j1" })).toBe(
      "/crm/settings/imports",
    )
  })

  it("resuelve contact.* al 360 del contacto ganador", () => {
    expect(notificationTarget("contact.merged", { contact_id: "c1" })).toBe(
      "/crm/contacts/c1",
    )
    expect(notificationTarget("contact.lifecycle_changed", {})).toBeNull()
  })

  it("lleva al despacho de Axel, y a la propuesta si la notificación la trae", () => {
    // Sin esto el dueño recibía «Axel te dejó 2 propuestas» y el clic no lo
    // movía de donde estaba.
    expect(notificationTarget("cmo.briefing_ready", { proposals_created: 2 })).toBe("/cmo")
    expect(notificationTarget("cmo.proposal_created", { proposal_id: "p1" })).toBe(
      "/cmo/proposals/p1",
    )
  })

  it("devuelve null para tipos desconocidos y data no-objeto", () => {
    expect(notificationTarget("usage.threshold", { metric: "messages" })).toBeNull()
    expect(notificationTarget("conversation.queued", null)).toBeNull()
    expect(notificationTarget("conversation.queued", "texto")).toBeNull()
  })
})
