/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

const postMock = jest.fn()

jest.mock("server-only", () => ({}))
jest.mock("@/core/services/http", () => ({
  http: { post: (...args: unknown[]) => postMock(...args) },
}))
jest.mock("next/headers", () => ({ cookies: async () => ({ set: jest.fn() }) }))
jest.mock("@/shared/auth/auth.handlers", () => ({ setSessionCookies: jest.fn() }))

import { POST } from "../route"

function login(headers: Record<string, string>) {
  return POST(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ email: "a@b.co", password: "x" }),
    }),
  )
}

const optionsOf = () => postMock.mock.calls[0][2] as { authenticate: boolean; headers: Record<string, string> }

beforeEach(() => {
  postMock.mockReset()
  postMock.mockResolvedValue({ access_token: "a", refresh_token: "r", token_type: "Bearer", expires_in: 900 })
})

describe("BFF de login: la IP del visitante llega al throttle del backend", () => {
  it("reenvía X-Forwarded-For", async () => {
    const res = await login({ "x-forwarded-for": "203.0.113.7" })
    expect(res.status).toBe(200)
    expect(optionsOf().authenticate).toBe(false)
    expect(optionsOf().headers).toMatchObject({ "X-Forwarded-For": "203.0.113.7" })
  })

  it("sin cabeceras de IP no inventa ninguna", async () => {
    await login({})
    expect(optionsOf().headers["X-Forwarded-For"]).toBeUndefined()
  })
})
