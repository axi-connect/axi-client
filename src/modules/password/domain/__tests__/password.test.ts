import { formatExpiresAt, invalidLinkReason, readTokenFromHash } from "../password"

describe("readTokenFromHash", () => {
  it("lee el token del fragmento, con o sin #", () => {
    expect(readTokenFromHash("#token=Zk3n0p-Qa_9sT2uV8wXyZ0123")).toBe("Zk3n0p-Qa_9sT2uV8wXyZ0123")
    expect(readTokenFromHash("token=Zk3n0p-Qa_9sT2uV8wXyZ0123&utm=x")).toBe("Zk3n0p-Qa_9sT2uV8wXyZ0123")
  })

  it("devuelve null sin token o con un token que no tiene su forma", () => {
    expect(readTokenFromHash("")).toBeNull()
    expect(readTokenFromHash("#")).toBeNull()
    expect(readTokenFromHash("#otra=cosa")).toBeNull()
    expect(readTokenFromHash("#token=corto")).toBeNull()
    expect(readTokenFromHash("#token=<script>alert(1)</script>xxxxxxxx")).toBeNull()
  })
})

describe("invalidLinkReason", () => {
  it("solo dice «ya se usó» cuando el servidor lo afirma", () => {
    expect(invalidLinkReason({ reason: "consumed" })).toBe("used")
    expect(invalidLinkReason({ reason: "used" })).toBe("used")
  })

  it("en cualquier otro caso asume vencido, que ofrece pedir un enlace nuevo", () => {
    expect(invalidLinkReason({ reason: "expired" })).toBe("expired")
    expect(invalidLinkReason({ reason: "revoked" })).toBe("expired")
    expect(invalidLinkReason(undefined)).toBe("expired")
    expect(invalidLinkReason(null)).toBe("expired")
  })
})

describe("formatExpiresAt", () => {
  it("pinta la fecha en hora de Colombia (UTC−5)", () => {
    // 20:40 UTC = 3:40 p. m. en Bogotá, jueves 1 de octubre de 2026.
    expect(formatExpiresAt("2026-10-01T20:40:00.000Z")).toBe("jue 1 oct · 3:40 p. m.")
  })

  it("cruza el día hacia atrás cuando en UTC ya es mañana", () => {
    expect(formatExpiresAt("2026-10-02T02:05:00Z")).toBe("jue 1 oct · 9:05 p. m.")
    expect(formatExpiresAt("2026-10-01T05:00:00Z")).toBe("jue 1 oct · 12:00 a. m.")
  })

  it("no inventa una fecha si no la entiende", () => {
    expect(formatExpiresAt("mañana")).toBe("")
  })
})
