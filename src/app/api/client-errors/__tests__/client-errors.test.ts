/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

import { POST } from "../route"
import { resetClientErrorRateLimit, sanitizeAsset, sanitizePath } from "../client-error-log"

/** Telemetría de errores del cliente (hotfix «Application error», 2026-10-19). */
function post(body: string, ip = "203.0.113.7") {
  return POST(
    new NextRequest("https://axi-connect.co/api/client-errors", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1`, "user-agent": "Mozilla/5.0 (iPhone)" },
    }),
  )
}

describe("POST /api/client-errors", () => {
  let log: jest.SpyInstance

  beforeEach(() => {
    resetClientErrorRateLimit()
    log = jest.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => log.mockRestore())

  it("escribe una línea client_error saneada y responde 204", async () => {
    const res = await post(
      JSON.stringify({
        kind: "chunk",
        name: "ChunkLoadError",
        message: "Loading chunk 98213 failed.",
        path: "/bienvenida/9f8a7b6c5d4e3f2a1b0c9d8e?x=1#token",
        asset: "https://axi-connect.co/_next/static/chunks/98213-abc.js?dpl=1",
      }),
    )
    expect(res.status).toBe(204)
    expect(log).toHaveBeenCalledTimes(1)
    const line = JSON.parse(log.mock.calls[0][0] as string)
    expect(line).toMatchObject({
      evt: "client_error",
      kind: "chunk",
      name: "ChunkLoadError",
      path: "/bienvenida/:x",
      asset: "/_next/static/chunks/98213-abc.js",
      ua: "Mozilla/5.0 (iPhone)",
    })
    expect(JSON.stringify(line)).not.toContain("9f8a7b6c5d4e3f2a1b0c9d8e")
  })

  it("un kind desconocido se registra como unknown, no como viene", async () => {
    await post(JSON.stringify({ kind: "<script>", name: "x" }))
    expect(JSON.parse(log.mock.calls[0][0] as string).kind).toBe("unknown")
  })

  it("rechaza cuerpos de más de 4 KB sin escribir nada", async () => {
    const res = await post(JSON.stringify({ kind: "chunk", message: "x".repeat(5000) }))
    expect(res.status).toBe(413)
    expect(log).not.toHaveBeenCalled()
  })

  it("rechaza lo que no es un objeto JSON", async () => {
    expect((await post("no-json")).status).toBe(400)
    expect((await post("[1,2]")).status).toBe(400)
    expect(log).not.toHaveBeenCalled()
  })

  it("limita a 20 por minuto por IP", async () => {
    for (let i = 0; i < 20; i += 1) expect((await post("{}")).status).toBe(204)
    expect((await post("{}")).status).toBe(429)
    expect((await post("{}", "198.51.100.2")).status).toBe(204)
  })
})

describe("saneado", () => {
  it.each([
    ["/configurar/abcdefghijklmnop1234/paso", "/configurar/:x/paso"],
    ["/pay/1234567", "/pay/:x"],
    ["/crm/contacts?q=ana#top", "/crm/contacts"],
    ["/auth/login", "/auth/login"],
  ])("path %s → %s", (input, expected) => {
    expect(sanitizePath(input)).toBe(expected)
  })

  it("el asset se queda en su path y sin query", () => {
    expect(sanitizeAsset("/_next/static/css/a.css?v=2")).toBe("/_next/static/css/a.css")
    expect(sanitizeAsset(42)).toBeUndefined()
  })
})
