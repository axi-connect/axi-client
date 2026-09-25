import { safeInternalNext } from "../safe-next"

const ORIGIN = "https://app.axi-connect.co"

/** Los vectores del QA (H3-1): ninguno sale del origen ni ejecuta nada. */
const HOSTILE_NEXTS = [
  "//evil.com",
  "https://evil.com",
  "/\\evil.com",
  "javascript:alert(1)",
  "/%2F%2Fevil.com",
  "http:/evil.com",
  "/\tevil.com",
  "\\\\evil.com",
  "data:text/html,<script>alert(1)</script>",
  "//evil.com/%2e%2e",
  "/\n/evil.com",
  " /dashboard",
  "evil.com",
  "/%09/evil.com",
  "/%0a/evil.com",
  "/%0D%0A/evil.com",
  "/crm/%00",
]

describe("safeInternalNext", () => {
  it.each(HOSTILE_NEXTS)("«%s» cae en el fallback", (next) => {
    expect(safeInternalNext(next, { origin: ORIGIN })).toBe("/dashboard")
  })

  it("una ruta interna pasa con su query y su hash, nunca como URL absoluta", () => {
    expect(safeInternalNext("/crm/pipeline?deal=1#nota", { origin: ORIGIN })).toBe("/crm/pipeline?deal=1#nota")
  })

  it("respeta el fallback, los prefijos bloqueados y la lista blanca", () => {
    expect(safeInternalNext(null, { origin: ORIGIN, fallback: "/platform" })).toBe("/platform")
    expect(safeInternalNext("/auth/login", { origin: ORIGIN, blockedPrefixes: ["/auth"] })).toBe("/dashboard")
    expect(safeInternalNext("/authors", { origin: ORIGIN, blockedPrefixes: ["/auth"] })).toBe("/authors")
    expect(safeInternalNext("/crm", { origin: ORIGIN, allowedPrefixes: ["/catalog"] })).toBe("/dashboard")
    expect(safeInternalNext("/catalog/products", { origin: ORIGIN, allowedPrefixes: ["/catalog"] })).toBe("/catalog/products")
  })
})
