import { buildInboxQuery, inboxQueryKey } from "../inbox-query"
import { serializePeriod } from "../inbox-filters.base"

const BASE = { view: "all_open" as const, sort: "recent" as const, q: "", filters: {}, page: 1 }

describe("buildInboxQuery", () => {
  it("cada vista fija status/mode/assigned; Cerradas es resolved,closed", () => {
    expect(buildInboxQuery(BASE)).toEqual({ status: "open", sort: "recent", page: 1, page_size: 25 })
    expect(buildInboxQuery({ ...BASE, view: "queued" })).toMatchObject({ status: "open", mode: "human_queued" })
    expect(buildInboxQuery({ ...BASE, view: "mine" })).toMatchObject({ status: "open", assigned: "me" })
    expect(buildInboxQuery({ ...BASE, view: "ai" })).toMatchObject({ status: "open", mode: "ai_active" })
    expect(buildInboxQuery({ ...BASE, view: "closed" })).toMatchObject({ status: "resolved,closed" })
  })

  it("q se recorta y se omite si queda vacía; sort siempre viaja", () => {
    expect(buildInboxQuery({ ...BASE, q: "  ana  " })).toMatchObject({ q: "ana" })
    expect(buildInboxQuery({ ...BASE, q: "   " })).not.toHaveProperty("q")
    expect(buildInboxQuery({ ...BASE, sort: "waiting" })).toMatchObject({ sort: "waiting" })
  })

  it("filtros: multi como CSV, switch solo cuando es true, single escalar", () => {
    const params = buildInboxQuery({
      ...BASE,
      filters: { channel_id: ["a", "b"], priority: ["urgent"], unread: true, assigned_user_id: "u1" },
    })
    expect(params).toMatchObject({ channel_id: "a,b", priority: "urgent", unread: true, assigned_user_id: "u1" })
    expect(buildInboxQuery({ ...BASE, filters: { unread: false } })).not.toHaveProperty("unread")
  })

  it("el rango de fechas viaja como from/to ISO con `to` exclusivo", () => {
    const params = buildInboxQuery({ ...BASE, filters: { period: ["2026-09-01", "2026-09-10"] } })
    expect(params.from).toBe(new Date(2026, 8, 1).toISOString())
    expect(params.to).toBe(new Date(2026, 8, 11).toISOString())
    expect(params).not.toHaveProperty("period_after")
    expect(serializePeriod(["", "2026-09-10"])).toEqual({ from: undefined, to: new Date(2026, 8, 11).toISOString() })
    expect(serializePeriod(undefined)).toEqual({ from: undefined, to: undefined })
  })

  it("la vista gana sobre un status colado en los filtros", () => {
    expect(buildInboxQuery({ ...BASE, view: "closed", filters: { status: "open" } })).toMatchObject({
      status: "resolved,closed",
    })
  })

  it("page y pageSize se respetan", () => {
    expect(buildInboxQuery({ ...BASE, page: 3, pageSize: 60 })).toMatchObject({ page: 3, page_size: 60 })
  })
})

describe("inboxQueryKey", () => {
  it("ignora la página y cambia con vista, orden, búsqueda y filtros", () => {
    const key = inboxQueryKey(BASE)
    expect(key).not.toMatch(/page/)
    expect(inboxQueryKey({ ...BASE, view: "closed" })).not.toBe(key)
    expect(inboxQueryKey({ ...BASE, sort: "oldest" })).not.toBe(key)
    expect(inboxQueryKey({ ...BASE, q: "ana" })).not.toBe(key)
    expect(inboxQueryKey({ ...BASE, filters: { unread: true } })).not.toBe(key)
    expect(inboxQueryKey({ ...BASE, filters: {} })).toBe(key)
  })
})
