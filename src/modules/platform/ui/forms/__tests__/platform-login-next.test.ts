jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }), useSearchParams: () => new URLSearchParams() }))

import { safeNext } from "../PlatformLoginForm"

describe("login de plataforma: next (QA H3-1)", () => {
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/platform/login", "/dashboard", "/platform\\@evil.com"])(
    "«%s» cae en /platform",
    (next) => {
      expect(safeNext(next)).toBe("/platform")
    },
  )

  it("una ruta de la consola se respeta", () => {
    expect(safeNext("/platform/tenants?q=a")).toBe("/platform/tenants?q=a")
  })
})
