/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("server-only", () => ({}))

import { GET } from "../route"

const TOKEN = "Zk3n0p-Qa_9sT2uV8wXyZ0123"
const ICS = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"
const fetchMock = jest.fn()

beforeAll(() => jest.spyOn(console, "warn").mockImplementation(() => {}))

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

function call(token: string, day: string, headers: Record<string, string> = {}) {
  return GET(new NextRequest(`http://localhost/bienvenida/${token}/citas/${day}`, { headers }), {
    params: Promise.resolve({ token, day }),
  })
}

function ics(extra: Record<string, string> = {}) {
  return new Response(ICS, {
    status: 200,
    headers: { "content-type": "text/calendar; charset=utf-8", ...extra },
  })
}

describe("GET /bienvenida/[token]/citas/[day]", () => {
  it("reenvía el .ics del backend como text/calendar con descarga", async () => {
    fetchMock.mockResolvedValue(ics({ "content-disposition": 'attachment; filename="axi-dia-2.ics"' }))
    const res = await call(TOKEN, "day2", { "x-forwarded-for": "203.0.113.7" })

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toMatch(/^text\/calendar/)
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="axi-dia-2.ics"')
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(await res.text()).toBe(ICS)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(new RegExp(`/api/v1/public/welcome/${TOKEN}/calls/day2\\.ics$`))
    expect(init.headers["X-Forwarded-For"]).toBe("203.0.113.7")
  })

  it("acepta el segmento con extensión, tal como lo enlaza el correo (day5.ics)", async () => {
    fetchMock.mockResolvedValue(ics())
    const res = await call(TOKEN, "day5.ics")
    expect(res.status).toBe(200)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/calls\/day5\.ics$/)
  })

  it("si el backend no manda Content-Disposition, pone uno propio", async () => {
    fetchMock.mockResolvedValue(ics())
    const res = await call(TOKEN, "day5")
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="axi-dia-5.ics"')
  })

  it.each(["day3", "dia2", "day2.ics.ics", "..%2F"])("un día que no es day2|day5 (%s) es 404 sin llamar al backend", async (day) => {
    const res = await call(TOKEN, day)
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("un token mal formado es 404 sin llamar al backend", async () => {
    const res = await call("corto", "day2")
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([400, 404, 410])("el kit vencido o inexistente (%i) sale como 404", async (status) => {
    fetchMock.mockResolvedValue(new Response("{}", { status }))
    const res = await call(TOKEN, "day2")
    expect(res.status).toBe(404)
  })

  it("el throttle (429) se reenvía con Retry-After", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 429, headers: { "retry-after": "30" } }))
    const res = await call(TOKEN, "day2")
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("30")
  })

  it("el backend caído es 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))
    const res = await call(TOKEN, "day2")
    expect(res.status).toBe(502)
  })
})
