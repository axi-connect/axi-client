import { CONTEXT_PANELS, visibleContextPanels } from "../registry"

jest.mock("../panels/ContactPanel", () => ({ ContactPanel: () => null, useContactHeading: () => ({ title: "" }) }))
jest.mock("../panels/AttachmentsPanel", () => ({ AttachmentsPanel: () => null, useAttachmentsHeading: () => ({ title: "" }), useAttachmentsCount: () => 0 }))
jest.mock("../panels/HistoryPanel", () => ({ HistoryPanel: () => null, useHistoryHeading: () => ({ title: "" }) }))
jest.mock("../panels/CallsPanel", () => ({ CallsPanel: () => null, useCallsHeading: () => ({ title: "" }) }))
jest.mock("../panels/OrdersPanel", () => ({ OrdersPanel: () => null, useOrdersHeading: () => ({ title: "" }) }))

const ids = (list: { id: string }[]) => list.map((panel) => panel.id)
const all = () => true

describe("visibleContextPanels — qué paneles se montan (F4)", () => {
  it("con todo, los cinco en su orden", () => {
    expect(ids(visibleContextPanels(CONTEXT_PANELS, { hasPermission: all, hasCapability: all, entitlementsLoaded: true }))).toEqual([
      "contact",
      "attachments",
      "history",
      "calls",
      "orders",
    ])
  })

  it("sin orders:read, Pedidos no se monta (ni llama al API)", () => {
    const visible = visibleContextPanels(CONTEXT_PANELS, {
      hasPermission: (permission) => permission !== "orders:read",
      hasCapability: all,
      entitlementsLoaded: true,
    })
    expect(ids(visible)).not.toContain("orders")
    expect(ids(visible)).toContain("contact")
  })

  it("sin la capacidad sales, o mientras no llegan los entitlements, tampoco", () => {
    expect(ids(visibleContextPanels(CONTEXT_PANELS, { hasPermission: all, hasCapability: (c) => c !== "sales", entitlementsLoaded: true }))).not.toContain("orders")
    expect(ids(visibleContextPanels(CONTEXT_PANELS, { hasPermission: all, hasCapability: all, entitlementsLoaded: false }))).not.toContain("orders")
  })
})
