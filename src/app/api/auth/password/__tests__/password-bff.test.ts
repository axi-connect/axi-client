/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { HttpError } from "@/core/api/problem"

const postMock = jest.fn()
type Jar = Map<string, { value: string }>
let jar: Jar

jest.mock("server-only", () => ({}))
jest.mock("@/core/services/http", () => ({
  http: { post: (...args: unknown[]) => postMock(...args) },
}))
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => jar.get(name),
    set: (name: string, value: string) => void jar.set(name, { value }),
    delete: (name: string) => void jar.delete(name),
  }),
}))

import { POST as change } from "../change/route"
import { POST as forgot } from "../forgot/route"
import { POST as inspect } from "../inspect/route"
import { POST as setPassword } from "../set/route"

const IP = "203.0.113.7, 10.0.0.2"
const TOKENS = { access_token: "new-access", token_type: "Bearer", expires_in: 900, refresh_token: "new-refresh" }

function request(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/auth/password/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": IP, "x-real-ip": "203.0.113.7" },
    body: JSON.stringify(body),
  })
}

function httpError(status: number, code: string, retryAfterSeconds?: number) {
  return new HttpError({
    status,
    code,
    message: code,
    problem: { type: "about:blank", title: code, status, code },
    retryAfterSeconds,
  })
}

const headersOf = (call: unknown[]) => (call[2] as { headers: Record<string, string> }).headers

beforeEach(() => {
  postMock.mockReset()
  jar = new Map([
    ["accessToken", { value: "old-access" }],
    ["refreshToken", { value: "old-refresh" }],
  ])
})

describe("los cuatro BFF de contraseña reenvían la IP del visitante", () => {
  it.each([
    ["forgot", forgot, { email: "a@b.co" }],
    ["inspect", inspect, { token: "Zk3n0p-Qa_9sT2uV8wXyZ0123" }],
    ["set", setPassword, { token: "Zk3n0p-Qa_9sT2uV8wXyZ0123", new_password: "una frase larga" }],
    ["change", change, { current_password: "vieja frase larga", new_password: "una frase larga" }],
  ] as const)("%s", async (name, handler, body) => {
    postMock.mockResolvedValue(name === "change" ? TOKENS : undefined)
    await handler(request(name, body))
    expect(headersOf(postMock.mock.calls[0])).toMatchObject({ "X-Forwarded-For": IP, "X-Real-IP": "203.0.113.7" })
  })
})

describe("change", () => {
  it("reescribe las cookies con la sesión que reemite el servidor", async () => {
    postMock.mockResolvedValue(TOKENS)
    const res = await change(request("change", { current_password: "vieja frase larga", new_password: "una frase larga" }))
    expect(res.status).toBe(200)
    expect(jar.get("accessToken")?.value).toBe("new-access")
    expect(jar.get("refreshToken")?.value).toBe("new-refresh")
  })

  it("una contraseña actual equivocada (422) no borra las cookies", async () => {
    postMock.mockRejectedValue(httpError(422, "auth/current_password_invalid"))
    const res = await change(request("change", { current_password: "mala", new_password: "una frase larga" }))
    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("auth/current_password_invalid")
    expect(jar.get("accessToken")?.value).toBe("old-access")
    expect(jar.get("refreshToken")?.value).toBe("old-refresh")
  })

  it("el throttle (429) se reenvía con Retry-After y sin tocar la sesión", async () => {
    postMock.mockRejectedValue(httpError(429, "auth/too_many_attempts", 120))
    const res = await change(request("change", { current_password: "mala", new_password: "una frase larga" }))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("120")
    expect((await res.json()).code).toBe("auth/too_many_attempts")
    expect(jar.get("accessToken")?.value).toBe("old-access")
    expect(jar.get("refreshToken")?.value).toBe("old-refresh")
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it("sin sesión responde 401 sin llamar al servidor", async () => {
    jar.clear()
    const res = await change(request("change", { current_password: "x", new_password: "una frase larga" }))
    expect(res.status).toBe(401)
    expect(postMock).not.toHaveBeenCalled()
  })
})

describe("set (QA-6): la sesión nueva del dueño", () => {
  const body = { token: "Zk3n0p-Qa_9sT2uV8wXyZ0123", new_password: "una frase larga" }

  it("con AuthTokensDto escribe las dos cookies y responde session: true sin los tokens", async () => {
    jar = new Map()
    postMock.mockResolvedValue(TOKENS)
    const res = await setPassword(request("set", body))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ session: true })
    expect(JSON.stringify(json)).not.toContain("new-access")
    expect(jar.get("accessToken")?.value).toBe("new-access")
    expect(jar.get("refreshToken")?.value).toBe("new-refresh")
  })

  it("con una sesión de soporte abierta no toca ninguna cookie", async () => {
    jar = new Map([["supportAccessToken", { value: "soporte" }]])
    postMock.mockResolvedValue(TOKENS)
    const res = await setPassword(request("set", body))
    expect(await res.json()).toEqual({ session: false })
    expect(jar.get("accessToken")).toBeUndefined()
    expect(jar.get("supportAccessToken")?.value).toBe("soporte")
  })

  it("un 204 (empresa suspendida o usuario no activo) deja session: false y no toca las cookies", async () => {
    jar = new Map([["accessToken", { value: "old-access" }]])
    postMock.mockResolvedValue(undefined)
    const res = await setPassword(request("set", body))
    expect(await res.json()).toEqual({ session: false })
    expect(jar.get("accessToken")?.value).toBe("old-access")
    expect(jar.has("refreshToken")).toBe(false)
  })

  it.each([
    [410, "auth/password_token_invalid"],
    [422, "validation/failed"],
    [503, "internal/unexpected"],
  ])("un error %i (%s) se reenvía y no toca las cookies existentes", async (status, code) => {
    jar = new Map([
      ["accessToken", { value: "old-access" }],
      ["refreshToken", { value: "old-refresh" }],
    ])
    postMock.mockRejectedValue(httpError(status, code))
    const res = await setPassword(request("set", body))
    expect(res.status).toBe(status)
    expect(jar.get("accessToken")?.value).toBe("old-access")
    expect(jar.get("refreshToken")?.value).toBe("old-refresh")
  })
})
