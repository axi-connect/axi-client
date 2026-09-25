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
