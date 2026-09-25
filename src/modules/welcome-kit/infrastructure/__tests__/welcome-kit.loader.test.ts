import { HttpError } from "@/core/api/problem"

const getMock = jest.fn()
jest.mock("server-only", () => ({}))
jest.mock("@/core/services/http", () => ({
  HttpClient: jest.fn().mockImplementation(() => ({ get: (...args: unknown[]) => getMock(...args) })),
}))

import { loadWelcomeKit } from "../welcome-kit.loader"

const TOKEN = "Zk3n0p-Qa_9sT2uV8wXyZ0123"
const fail = (status: number) =>
  new HttpError({ status, code: `http/${status}`, message: "x", problem: null })

describe("loadWelcomeKit", () => {
  beforeEach(() => getMock.mockReset())

  it("llama sin sesión y con la IP del visitante", async () => {
    getMock.mockRejectedValue(fail(410))
    await loadWelcomeKit(TOKEN, { "X-Forwarded-For": "203.0.113.7", "X-Real-IP": "203.0.113.7" })
    expect(getMock).toHaveBeenCalledWith(`/public/welcome/${TOKEN}`, undefined, {
      authenticate: false,
      headers: { "X-Forwarded-For": "203.0.113.7", "X-Real-IP": "203.0.113.7" },
    })
  })

  it("el throttle (429) es «busy», no «no disponible»", async () => {
    getMock.mockRejectedValue(fail(429))
    await expect(loadWelcomeKit(TOKEN)).resolves.toEqual({ status: "busy" })
  })

  it("404 y 410 son el kit vencido; un 500 es «no disponible»", async () => {
    getMock.mockRejectedValueOnce(fail(404)).mockRejectedValueOnce(fail(410)).mockRejectedValueOnce(fail(500))
    jest.spyOn(console, "warn").mockImplementation(() => {})
    await expect(loadWelcomeKit(TOKEN)).resolves.toEqual({ status: "gone" })
    await expect(loadWelcomeKit(TOKEN)).resolves.toEqual({ status: "gone" })
    await expect(loadWelcomeKit(TOKEN)).resolves.toEqual({ status: "unavailable" })
  })

  it("un token con forma imposible no sale a la red", async () => {
    await expect(loadWelcomeKit("../../x")).resolves.toEqual({ status: "gone" })
    expect(getMock).not.toHaveBeenCalled()
  })
})
