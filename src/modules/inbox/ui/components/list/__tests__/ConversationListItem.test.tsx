import { render, screen } from "@testing-library/react"
import { ConversationListItem } from "../ConversationListItem"
import type { InboxConversation } from "@/modules/inbox/domain/inbox"

// jueves 10 de septiembre de 2026, 15:00 (local)
const NOW = new Date(2026, 8, 10, 15, 0).getTime()
const iso = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min).toISOString()

function makeConversation(overrides: Partial<InboxConversation> = {}): InboxConversation {
  return {
    id: "c1",
    channel_id: "ch1",
    contact_id: "k1",
    status: "open",
    mode: "human_active",
    assigned_user_id: "u1",
    priority: "normal",
    unread_count: 0,
    last_message_at: iso(2026, 9, 10, 14, 32),
    last_inbound_at: iso(2026, 9, 10, 14, 32),
    last_message_preview: "¿Tienen el vestido Luna en talla M?",
    queued_at: null,
    closed_at: null,
    contact: { id: "k1", full_name: "Cristian Velásquez", phone: "+573001234567", avatar_url: null },
    channel: { id: "ch1", name: "WhatsApp ventas", kind: "whatsapp_cloud" },
    created_at: iso(2026, 9, 1),
    updated_at: iso(2026, 9, 10),
    ...overrides,
  } as InboxConversation
}

const renderItem = (conversation: InboxConversation, props: Partial<Parameters<typeof ConversationListItem>[0]> = {}) =>
  render(
    <ul>
      <ConversationListItem conversation={conversation} active={false} now={NOW} showMode={false} onSelect={() => {}} {...props} />
    </ul>,
  )

describe("ConversationListItem", () => {
  it("no leída: nombre accesible con el conteo, burbuja y hora de hoy", () => {
    renderItem(makeConversation({ unread_count: 3 }))
    expect(screen.getByRole("button", { name: /Cristian Velásquez, 3 sin leer/ })).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("14:32")).toBeInTheDocument()
  })

  it("tope 99+ y badge del canal nombrado", () => {
    renderItem(makeConversation({ unread_count: 120 }))
    expect(screen.getByText("99+")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Canal: WhatsApp ventas" })).toBeInTheDocument()
  })

  it("fechas con contexto: Ayer / día de la semana / dd/mm/aa con título completo", () => {
    renderItem(makeConversation({ id: "a", last_message_at: iso(2026, 9, 9, 23, 50) }))
    renderItem(makeConversation({ id: "b", last_message_at: iso(2026, 9, 7) }))
    renderItem(makeConversation({ id: "c", last_message_at: iso(2026, 9, 1) }))
    expect(screen.getByText("Ayer")).toBeInTheDocument()
    expect(screen.getByText("Lunes")).toBeInTheDocument()
    expect(screen.getByText("01/09/26")).toHaveAttribute("title", expect.stringMatching(/1 de septiembre de 2026/))
  })

  it("en cola: tercera línea ámbar con el tiempo desde queued_at", () => {
    renderItem(makeConversation({ mode: "human_queued", assigned_user_id: null, queued_at: iso(2026, 9, 10, 14, 48) }))
    expect(screen.getByText("En cola · 12 min")).toBeInTheDocument()
  })

  it("prioridad: data-priority solo en high/urgent", () => {
    renderItem(makeConversation({ id: "n", priority: "normal" }))
    renderItem(makeConversation({ id: "u", priority: "urgent" }))
    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).not.toHaveAttribute("data-priority")
    expect(buttons[1]).toHaveAttribute("data-priority", "urgent")
  })

  it("IA solo cuando la vista mezcla modos", () => {
    renderItem(makeConversation({ id: "x", mode: "ai_active" }), { showMode: false })
    expect(screen.queryByText("IA")).not.toBeInTheDocument()
    renderItem(makeConversation({ id: "y", mode: "ai_active" }), { showMode: true })
    expect(screen.getByText("IA")).toBeInTheDocument()
  })

  it("cerrada: sin burbuja aunque tenga no leídos, con fecha de cierre", () => {
    renderItem(makeConversation({ status: "resolved", unread_count: 4, closed_at: iso(2026, 9, 8, 11, 20), last_message_at: iso(2026, 9, 8, 11, 19) }))
    expect(screen.queryByText("4")).not.toBeInTheDocument()
    expect(screen.getByText("Resuelta · Martes")).toBeInTheDocument()
  })

  it("activa ⇒ aria-current", () => {
    renderItem(makeConversation(), { active: true })
    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true")
  })
})
