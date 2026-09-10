import {
  compareConversations,
  isInboxView,
  isReadOnlyConversation,
  viewToQuery,
  type InboxConversation,
} from "../inbox"

const row = (overrides: Partial<InboxConversation>): InboxConversation =>
  ({
    id: "id",
    unread_count: 0,
    last_message_at: null,
    queued_at: null,
    priority: "normal",
    status: "open",
    ...overrides,
  }) as InboxConversation

describe("viewToQuery / isInboxView / isReadOnlyConversation", () => {
  it("cada vista fija sus parámetros; Cerradas = resolved,closed", () => {
    expect(viewToQuery("all_open")).toEqual({ status: "open" })
    expect(viewToQuery("queued")).toEqual({ status: "open", mode: "human_queued" })
    expect(viewToQuery("mine")).toEqual({ status: "open", assigned: "me" })
    expect(viewToQuery("ai")).toEqual({ status: "open", mode: "ai_active" })
    expect(viewToQuery("closed")).toEqual({ status: "resolved,closed" })
  })
  it("valida la vista de la URL y detecta solo lectura", () => {
    expect(isInboxView("closed")).toBe(true)
    expect(isInboxView("nope")).toBe(false)
    expect(isReadOnlyConversation({ status: "resolved" })).toBe(true)
    expect(isReadOnlyConversation({ status: "snoozed" })).toBe(false)
  })
})

describe("compareConversations (espejo del orderBy del backend)", () => {
  const a = row({ id: "a", last_message_at: "2026-09-10T10:00:00Z", unread_count: 0, priority: "low", queued_at: "2026-09-10T09:00:00Z" })
  const b = row({ id: "b", last_message_at: "2026-09-10T12:00:00Z", unread_count: 3, priority: "urgent", queued_at: null })
  const c = row({ id: "c", last_message_at: null, unread_count: 1, priority: "high", queued_at: "2026-09-10T08:00:00Z" })
  const ids = (sort: Parameters<typeof compareConversations>[0]) =>
    [a, b, c].sort(compareConversations(sort)).map((x) => x.id)

  it("recent: más reciente primero, sin actividad al final (la prioridad NO reordena)", () => {
    expect(ids("recent")).toEqual(["b", "a", "c"])
  })
  it("oldest: más antigua primero, sin actividad al final", () => {
    expect(ids("oldest")).toEqual(["a", "b", "c"])
  })
  it("unread: más no leídos primero", () => {
    expect(ids("unread")).toEqual(["b", "c", "a"])
  })
  it("waiting: más tiempo en cola primero, sin cola al final", () => {
    expect(ids("waiting")).toEqual(["c", "a", "b"])
  })
  it("priority: urgente > alta > normal > baja", () => {
    expect(ids("priority")).toEqual(["b", "c", "a"])
  })
})
