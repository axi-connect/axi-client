/**
 * @jest-environment node
 *
 * Server-side (RSC y route handlers), el HttpClient lee la cookie: bajo
 * soporte, `supportAccessToken` manda sobre `accessToken` (support-session.ts).
 */
let jar: Map<string, { value: string }>
jest.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => jar.get(name) }) }))

import { HttpClient } from "../http"

const fetchMock = jest.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))
  global.fetch = fetchMock as unknown as typeof fetch
})

const authOf = () => (fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization

describe("HttpClient server-side y la cookie de soporte", () => {
  it("con supportAccessToken, ese es el Bearer aunque haya accessToken", async () => {
    jar = new Map([
      ["supportAccessToken", { value: "soporte" }],
      ["accessToken", { value: "cliente" }],
    ])
    await new HttpClient("http://backend.test").get("/auth/me")
    expect(authOf()).toBe("Bearer soporte")
  })

  it("sin ella, el accessToken del cliente", async () => {
    jar = new Map([["accessToken", { value: "cliente" }]])
    await new HttpClient("http://backend.test").get("/auth/me")
    expect(authOf()).toBe("Bearer cliente")
  })
})
