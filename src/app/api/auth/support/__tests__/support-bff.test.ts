/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { HttpError } from "@/core/api/problem"

const postMock = jest.fn()
type Jar = Map<string, { value: string }>
let jar: Jar
const written: { name: string; value: string; options: Record<string, unknown> }[] = []
const deleted: string[] = []

jest.mock("server-only", () => ({}))
jest.mock("@/core/services/http", () => ({ http: { post: (...args: unknown[]) => postMock(...args) } }))
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => jar.get(name),
    set: (name: string, value: string, options: Record<string, unknown> = {}) => {
      written.push({ name, value, options })
      jar.set(name, { value })
    },
    delete: (name: string) => {
      deleted.push(name)
      jar.delete(name)
    },
  }),
}))

import { POST as redeem } from "../redeem/route"
import { POST as end } from "../end/route"

const CODE = "c".repeat(43)
const TOKENS = {
  access_token: "token-de-soporte",
  token_type: "Bearer",
  expires_in: 3600,
  expires_at: "2026-09-25T18:00:00Z",
  session_id: "00000000-0000-4000-8000-000000000001",
}

function redeemRequest(headers: Record<string, string> = { "x-platform-token": "plat-token" }, body: unknown = { code: CODE }) {
  return new NextRequest("http://localhost/api/auth/support/redeem", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  postMock.mockReset()
  written.length = 0
  deleted.length = 0
  jar = new Map()
})

describe("POST /api/auth/support/redeem", () => {
  it("canjea con X-Platform-Token y escribe SOLO supportAccessToken (httpOnly, secure, lax, maxAge)", async () => {
    postMock.mockResolvedValue(TOKENS)
    const res = await redeem(redeemRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, expires_at: TOKENS.expires_at, redirect: "/dashboard" })
    expect(JSON.stringify(body)).not.toContain("token-de-soporte")

    const [path, payload, options] = postMock.mock.calls[0]
    expect(path).toBe("/auth/support/redeem")
    expect(payload).toEqual({ code: CODE })
    expect(options.authenticate).toBe(false)
    expect(options.headers).toMatchObject({ "X-Platform-Token": "plat-token", "X-Forwarded-For": "203.0.113.7" })

    expect(written).toHaveLength(1)
    expect(written[0]).toMatchObject({
      name: "supportAccessToken",
      value: "token-de-soporte",
      options: { httpOnly: true, secure: true, sameSite: "lax", maxAge: 3600, path: "/" },
    })
  })

  it.each([["accessToken"], ["refreshToken"]])(
    "con una sesión de cliente (%s) entra igual: escribe SOLO la cookie de soporte y no toca la del cliente",
    async (cookie) => {
      jar = new Map([[cookie, { value: "del-cliente" }]])
      postMock.mockResolvedValueOnce(TOKENS)
      const res = await redeem(redeemRequest())
      expect(res.status).toBe(200)
      expect(written).toHaveLength(1)
      expect(written[0]).toMatchObject({ name: "supportAccessToken", value: "token-de-soporte" })
      expect(deleted).toHaveLength(0)
      expect(jar.get(cookie)?.value).toBe("del-cliente")
    },
  )

  it("sin token de plataforma no llama al backend", async () => {
    const res = await redeem(redeemRequest({}))
    expect(res.status).toBe(401)
    expect(postMock).not.toHaveBeenCalled()
  })

  it("un código con forma imposible es 400", async () => {
    const res = await redeem(redeemRequest(undefined, { code: "corto" }))
    expect(res.status).toBe(400)
  })

  it("el código vencido o usado (410) pasa tal cual, sin cookie", async () => {
    postMock.mockRejectedValue(
      new HttpError({
        status: 410,
        code: "auth/support_handoff_invalid",
        message: "x",
        problem: { type: "about:blank", title: "x", status: 410, code: "auth/support_handoff_invalid" },
      }),
    )
    const res = await redeem(redeemRequest())
    expect(res.status).toBe(410)
    expect((await res.json()).code).toBe("auth/support_handoff_invalid")
    expect(written).toHaveLength(0)
  })
})

describe("POST /api/auth/support/end", () => {
  it("cierra la sesión en el backend con su token y borra la cookie", async () => {
    jar = new Map([["supportAccessToken", { value: "token-de-soporte" }]])
    postMock.mockResolvedValue({ session_id: TOKENS.session_id, already_ended: false })
    const res = await end()
    expect(res.status).toBe(200)
    expect(postMock).toHaveBeenCalledWith("/auth/support/end", undefined, {
      headers: { Authorization: "Bearer token-de-soporte" },
    })
    expect(deleted).toEqual(["supportAccessToken"])
  })

  it("aunque el backend falle, la cookie se borra", async () => {
    jar = new Map([["supportAccessToken", { value: "token-de-soporte" }]])
    postMock.mockRejectedValue(new Error("caído"))
    await end()
    expect(deleted).toEqual(["supportAccessToken"])
  })

  it("sin sesión de soporte no toca la sesión del cliente", async () => {
    jar = new Map([["accessToken", { value: "del-cliente" }]])
    await end()
    expect(postMock).not.toHaveBeenCalled()
    expect(deleted).toHaveLength(0)
  })
})
