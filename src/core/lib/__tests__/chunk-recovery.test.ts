import {
  CHUNK_RECOVERY_SCRIPT,
  CHUNK_RELOAD_KEY,
  CHUNK_RELOAD_WINDOW_MS,
  isChunkLoadError,
  reloadOnce,
} from "@/core/lib/chunk-recovery"

/**
 * Hotfix «Application error» (docs/plans/hotfix_application_error_plan.md):
 * un chunk que no carga recarga UNA vez por ventana, nunca en bucle.
 */
describe("isChunkLoadError", () => {
  it.each([
    [{ name: "ChunkLoadError", message: "Loading chunk 123 failed." }],
    [new Error("Loading chunk 98213 failed.\n(error: https://axi-connect.co/_next/static/chunks/98213-abc.js)")],
    [new Error("Loading CSS chunk 51 failed.")],
    [new TypeError("Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js")],
  ])("reconoce %p", (error) => {
    expect(isChunkLoadError(error)).toBe(true)
  })

  it.each([[new Error("Cannot read properties of undefined")], [null], ["ChunkLoadError"], [{ message: 42 }]])(
    "no confunde %p con un chunk",
    (error) => {
      expect(isChunkLoadError(error)).toBe(false)
    },
  )
})

describe("reloadOnce", () => {
  beforeEach(() => window.sessionStorage.clear())

  it("recarga la primera vez y anota el instante", () => {
    const reload = jest.fn()
    expect(reloadOnce(1_000_000, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe("1000000")
  })

  it("dentro de la ventana no vuelve a recargar (sin bucle)", () => {
    const reload = jest.fn()
    reloadOnce(1_000_000, reload)
    expect(reloadOnce(1_000_000 + CHUNK_RELOAD_WINDOW_MS - 1, reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("pasada la ventana vuelve a poder recargar (otro despliegue, otro día)", () => {
    const reload = jest.fn()
    reloadOnce(1_000_000, reload)
    expect(reloadOnce(1_000_000 + CHUNK_RELOAD_WINDOW_MS, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it("sin sessionStorage no recarga: no habría forma de evitar un bucle", () => {
    const reload = jest.fn()
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError")
    })
    expect(reloadOnce(1_000_000, reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe("CHUNK_RECOVERY_SCRIPT (en línea en el <head>)", () => {
  type Harness = { reload: jest.Mock; beacon: jest.Mock; cleanup: () => void }

  /**
   * Corre el script con `location` y `navigator` de mentira (jsdom no deja
   * espiar `location.reload`); los listeners sí quedan en el `window` real.
   */
  function run(): Harness {
    const reload = jest.fn()
    const beacon = jest.fn(() => true)
    const added: [string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined][] = []
    const original = window.addEventListener.bind(window)
    const spy = jest.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      added.push([type, listener, options])
      original(type, listener, options)
    })
    new Function("location", "navigator", CHUNK_RECOVERY_SCRIPT)(
      { reload, pathname: "/auth/login" },
      { sendBeacon: beacon },
    )
    spy.mockRestore()
    return {
      reload,
      beacon,
      cleanup: () => added.forEach(([type, listener, options]) => window.removeEventListener(type, listener, options)),
    }
  }

  function failScript(src: string) {
    const script = document.createElement("script")
    script.src = src
    document.head.appendChild(script)
    script.dispatchEvent(new Event("error"))
    script.remove()
  }

  beforeEach(() => window.sessionStorage.clear())

  it("es ES5 válido y no lanza al evaluarse", () => {
    const h = run()
    h.cleanup()
  })

  it("un chunk de /_next/static/ que falla recarga una vez e informa", () => {
    const h = run()
    failScript("https://axi-connect.co/_next/static/chunks/98213-abc.js")
    failScript("https://axi-connect.co/_next/static/chunks/777-def.js")
    expect(h.reload).toHaveBeenCalledTimes(1)
    expect(h.beacon).toHaveBeenCalledWith("/api/client-errors", expect.any(Blob))
    h.cleanup()
  })

  it("un script de terceros que falla no recarga", () => {
    const h = run()
    failScript("https://connect.facebook.net/es_LA/sdk.js")
    expect(h.reload).not.toHaveBeenCalled()
    h.cleanup()
  })

  it("si ya recargó hace poco, solo informa (sin bucle)", () => {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    const h = run()
    failScript("https://axi-connect.co/_next/static/chunks/98213-abc.js")
    expect(h.reload).not.toHaveBeenCalled()
    expect(h.beacon).toHaveBeenCalledTimes(1)
    h.cleanup()
  })
})
