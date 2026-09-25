import { minutesLeft, readHandoffCode, redeemFailure } from "../support-access"

const CODE = "Zk3n0p-Qa_9sT2uV8wXyZ0123456789abcdefABCDE"

describe("readHandoffCode", () => {
  it("lee #code=… en base64url", () => {
    expect(readHandoffCode(`#code=${CODE}`)).toBe(CODE)
    expect(readHandoffCode(`code=${CODE}&x=1`)).toBe(CODE)
  })

  it.each(["", "#", "#code=", "#code=corto", `#token=${CODE}`, `#code=${CODE}%20`])("rechaza «%s»", (hash) => {
    expect(readHandoffCode(hash)).toBeNull()
  })
})

describe("minutesLeft", () => {
  const now = Date.parse("2026-09-25T10:00:00Z")
  it("redondea hacia arriba y termina en 0", () => {
    expect(minutesLeft("2026-09-25T10:58:10Z", now)).toBe(59)
    expect(minutesLeft("2026-09-25T10:00:30Z", now)).toBe(1)
    expect(minutesLeft("2026-09-25T09:59:00Z", now)).toBe(0)
    expect(minutesLeft("no-es-fecha", now)).toBe(0)
  })
})

describe("redeemFailure", () => {
  it("distingue cada desenlace del canje", () => {
    expect(redeemFailure(409, "auth/support_session_conflict")).toBe("conflict")
    expect(redeemFailure(410, "auth/support_handoff_invalid")).toBe("invalid")
    expect(redeemFailure(401, "auth/unauthorized")).toBe("no_platform_session")
    expect(redeemFailure(429, undefined)).toBe("busy")
    expect(redeemFailure(503, "client/network")).toBe("unavailable")
  })
})

describe("safeSupportNext: el next de /auth/soporte (open redirect)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { safeSupportNext, readHandoffNext } = require("../support-access") as typeof import("../support-access")
  const ORIGIN = "https://app.axi-connect.co"

  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/%2F%2Fevil.com", "http:/evil.com", "/\tevil.com", "", null, "/auth/login", "/platform/tenants", "/dashboardx", " /dashboard"])(
    "«%s» cae en /dashboard",
    (next) => {
      expect(safeSupportNext(next as string | null, ORIGIN)).toBe("/dashboard")
    },
  )

  it.each([
    ["/admin/agents", "/admin/agents"],
    ["/settings/payments", "/settings/payments"],
    ["/settings/company", "/settings/company"],
    ["/catalog/products?q=1", "/catalog/products?q=1"],
    ["/dashboard", "/dashboard"],
  ])("«%s» es una pantalla del panel: %s", (next, expected) => {
    expect(safeSupportNext(next, ORIGIN)).toBe(expected)
  })

  it("lee el next que viaja junto al código en el #", () => {
    expect(readHandoffNext("#code=abc&next=%2Fadmin%2Fagents")).toBe("/admin/agents")
    expect(readHandoffNext("#code=abc")).toBeNull()
  })
})
