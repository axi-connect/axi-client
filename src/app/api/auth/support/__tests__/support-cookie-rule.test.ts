/**
 * @jest-environment node
 *
 * La regla CRÍTICA del acceso de soporte en el BFF (entrega F3):
 * 1. si existe `supportAccessToken`, ESE es el Bearer en toda ruta de tenant;
 * 2. con él jamás se intenta un refresh;
 * 3. un 401 bajo soporte borra SOLO `supportAccessToken` y la pestaña va a
 *    «La sesión de soporte terminó»;
 * 4. las cookies de un cliente que conviva en el navegador nunca se tocan.
 */
import { NextRequest } from "next/server"

const postMock = jest.fn()
const getMock = jest.fn()
type Jar = Map<string, { value: string }>
let jar: Jar
const deleted: string[] = []
const written: { name: string; value: string; options: Record<string, unknown> }[] = []

jest.mock("server-only", () => ({}))
jest.mock("@/core/services/http", () => ({
  http: {
    post: (...args: unknown[]) => postMock(...args),
    get: (...args: unknown[]) => getMock(...args),
  },
}))
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

import { refreshSession } from "@/shared/auth/auth.handlers"
import { GET as proxyGet, POST as proxyPost } from "../../../proxy/[...path]/route"
import { GET as sessionGet } from "../../session/route"
import { GET as tokenGet } from "../../token/route"
import { POST as logout } from "../../logout/route"
import { POST as changePassword } from "../../password/change/route"
import { middleware } from "@/middleware"

const fetchMock = jest.fn()

function jwt(expSecondsFromNow: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })).toString("base64url")
  return `h.${payload}.s`
}

const SUPPORT = jwt(3600)

function httpError(status: number, code: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { HttpError } = require("@/core/api/problem")
  return new HttpError({ status, code, message: code, problem: { type: "about:blank", title: code, status, code } })
}

beforeEach(() => {
  postMock.mockReset()
  getMock.mockReset()
  fetchMock.mockReset()
  deleted.length = 0
  written.length = 0
  global.fetch = fetchMock as unknown as typeof fetch
  fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }))
})

const bearerSent = () => (fetchMock.mock.calls[0][1].headers as Headers).get("authorization")

describe("proxy BFF bajo soporte", () => {
  it("usa el token de soporte aunque haya cookies de cliente, y no refresca", async () => {
    jar = new Map([
      ["supportAccessToken", { value: SUPPORT }],
      ["accessToken", { value: "cliente" }],
      ["refreshToken", { value: "refresh-del-cliente" }],
    ])
    const res = await proxyGet(new NextRequest("http://localhost/api/proxy/contacts"))
    expect(res.status).toBe(200)
    expect(bearerSent()).toBe(`Bearer ${SUPPORT}`)
    expect(postMock).not.toHaveBeenCalled() // ningún /auth/refresh
    expect(written).toHaveLength(0)
  })

  it("un token de soporte a punto de vencer tampoco se refresca", async () => {
    jar = new Map([["supportAccessToken", { value: jwt(10) }]])
    await proxyGet(new NextRequest("http://localhost/api/proxy/contacts"))
    expect(postMock).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("un 401 borra SOLO la cookie de soporte, no reintenta y dice que la sesión terminó", async () => {
    jar = new Map([
      ["supportAccessToken", { value: SUPPORT }],
      ["refreshToken", { value: "refresh-del-cliente" }],
    ])
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }))
    const res = await proxyPost(
      new NextRequest("http://localhost/api/proxy/products", { method: "POST", body: "{}" }),
    )
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe("auth/support_session_ended")
    expect(deleted).toEqual(["supportAccessToken"])
    expect(jar.get("refreshToken")?.value).toBe("refresh-del-cliente")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(postMock).not.toHaveBeenCalled()
  })

  it("el 403 de una acción bloqueada pasa tal cual (el toast lo pinta el panel)", async () => {
    jar = new Map([["supportAccessToken", { value: SUPPORT }]])
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "auth/support_action_forbidden" }), {
        status: 403,
        headers: { "content-type": "application/problem+json" },
      }),
    )
    const res = await proxyPost(new NextRequest("http://localhost/api/proxy/users", { method: "POST", body: "{}" }))
    expect(res.status).toBe(403)
    expect(deleted).toHaveLength(0)
  })

  it("sin cookie de soporte, el proxy sigue con la sesión del cliente", async () => {
    jar = new Map([["accessToken", { value: jwt(3600) }]])
    await proxyGet(new NextRequest("http://localhost/api/proxy/contacts"))
    expect(bearerSent()).toBe(`Bearer ${jar.get("accessToken")?.value}`)
  })
})

describe("refreshSession bajo soporte", () => {
  it("no llama al backend ni toca ninguna cookie", async () => {
    const store = {
      get: (name: string) => (name === "supportAccessToken" ? { value: SUPPORT } : name === "refreshToken" ? { value: "r" } : undefined),
      set: jest.fn(),
      delete: jest.fn(),
    }
    const result = await refreshSession(store as never)
    expect(result).toEqual({ ok: false, status: 401, code: "auth/support_session_ended" })
    expect(postMock).not.toHaveBeenCalled()
    expect(store.set).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })
})

describe("hidratación y tiempo real bajo soporte", () => {
  it("/api/auth/session con el token de soporte vencido: borra solo esa cookie y avisa el fin", async () => {
    jar = new Map([["supportAccessToken", { value: SUPPORT }]])
    getMock.mockRejectedValue(httpError(401, "auth/unauthorized"))
    const res = await sessionGet()
    expect(await res.json()).toEqual({ isAuthenticated: false, code: "auth/support_session_ended" })
    expect(deleted).toEqual(["supportAccessToken"])
    expect(postMock).not.toHaveBeenCalled()
  })

  it("/api/auth/token entrega el token de soporte sin refrescarlo", async () => {
    jar = new Map([["supportAccessToken", { value: SUPPORT }]])
    const res = await tokenGet()
    expect((await res.json()).token).toBe(SUPPORT)
    expect(postMock).not.toHaveBeenCalled()
  })

  it("/api/auth/token con el token de soporte vencido: 401, fin de la sesión", async () => {
    jar = new Map([["supportAccessToken", { value: jwt(-5) }]])
    const res = await tokenGet()
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe("auth/support_session_ended")
    expect(deleted).toEqual(["supportAccessToken"])
  })
})

describe("otras rutas de tenant bajo soporte", () => {
  it("logout cierra la sesión de soporte y nada más", async () => {
    jar = new Map([
      ["supportAccessToken", { value: SUPPORT }],
      ["refreshToken", { value: "refresh-del-cliente" }],
    ])
    postMock.mockResolvedValue({})
    await logout()
    expect(postMock).toHaveBeenCalledWith("/auth/support/end", undefined, {
      headers: { Authorization: `Bearer ${SUPPORT}` },
    })
    expect(deleted).toEqual(["supportAccessToken"])
  })

  it("cambiar contraseña está bloqueado (reescribiría las cookies del cliente)", async () => {
    jar = new Map([["supportAccessToken", { value: SUPPORT }]])
    const res = await changePassword(
      new NextRequest("http://localhost/api/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ current_password: "una vieja frase", new_password: "una frase nueva larga" }),
      }),
    )
    expect(res.status).toBe(403)
    // problem+json con detail: el aviso dice «No disponible en soporte», no «Forbidden» (QA H2-1)
    expect(res.headers.get("content-type")).toContain("application/problem+json")
    const problem = await res.json()
    expect(problem).toMatchObject({ code: "auth/support_action_forbidden", status: 403, detail: "No disponible en soporte", title: "No disponible en soporte" })
    expect(postMock).not.toHaveBeenCalled()
  })

  it("el middleware cuenta la cookie de soporte como sesión en las rutas privadas", () => {
    const withSupport = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: `supportAccessToken=${SUPPORT}` },
    })
    expect(middleware(withSupport).headers.get("location")).toBeNull()
    const without = new NextRequest("http://localhost/dashboard")
    expect(middleware(without).headers.get("location")).toContain("/auth/login")
  })
})
