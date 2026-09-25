/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("server-only", () => ({}))
jest.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "accessToken" ? { value: "tok" } : undefined) }),
}))
// Token vigente de sobra: el proxy no refresca y va directo al backend.
jest.mock("@/shared/auth/auth.handlers", () => ({
  getAccessTokenExpiry: () => Date.now() + 10 * 60_000,
  refreshSession: jest.fn(),
}))

import { GET, POST } from "../route"

const fetchMock = jest.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }))
  global.fetch = fetchMock as unknown as typeof fetch
})

const sentHeaders = () => fetchMock.mock.calls[0][1].headers as Headers

describe("proxy BFF: la IP del visitante llega al backend", () => {
  it("reenvía X-Forwarded-For tal como llegó del proxy de entrada", async () => {
    await GET(
      new NextRequest("http://localhost/api/proxy/contacts", {
        headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.2" },
      }),
    )
    expect(sentHeaders().get("x-forwarded-for")).toBe("203.0.113.7, 10.0.0.2")
    expect(sentHeaders().get("authorization")).toBe("Bearer tok")
  })

  it("sin X-Forwarded-For, usa X-Real-IP", async () => {
    await POST(
      new NextRequest("http://localhost/api/proxy/contacts", {
        method: "POST",
        headers: { "x-real-ip": "198.51.100.4", "content-type": "application/json" },
        body: "{}",
      }),
    )
    expect(sentHeaders().get("x-forwarded-for")).toBe("198.51.100.4")
  })

  it("sin cabeceras de IP no inventa ninguna", async () => {
    await GET(new NextRequest("http://localhost/api/proxy/contacts"))
    expect(sentHeaders().get("x-forwarded-for")).toBeNull()
  })

  it("no reenvía cabeceras arbitrarias del navegador", async () => {
    await GET(
      new NextRequest("http://localhost/api/proxy/contacts", {
        headers: { cookie: "accessToken=tok", "x-forwarded-for": "203.0.113.7" },
      }),
    )
    expect(sentHeaders().get("cookie")).toBeNull()
  })
})
