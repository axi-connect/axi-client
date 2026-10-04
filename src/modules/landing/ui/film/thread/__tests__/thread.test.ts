/**
 * El hilo en la página: monta su canvas, solo dibuja cuando algo cambió, enciende
 * las escenas al pasar la luz, se apaga pasada la película y se retira sin dejar
 * rastro. El renderer se sustituye por un doble (jsdom no tiene WebGL).
 */
import type { ThreadPath } from "@/modules/landing/domain/film/thread-geometry"

import { createThread, type ThreadOptions } from "../thread"
import type { ThreadFrame, ThreadRenderer } from "../thread-renderer"

const VH = 1000

function fakeRenderer() {
  const frames: ThreadFrame[] = []
  const r: ThreadRenderer & { frames: ThreadFrame[]; cleared: number; degraded: number; destroyed: boolean } = {
    kind: "gl",
    frames,
    cleared: 0,
    degraded: 0,
    destroyed: false,
    resize: jest.fn(),
    draw: (f) => {
      frames.push({ ...f, pointer: { ...f.pointer } })
    },
    clear() {
      r.cleared++
    },
    degrade() {
      r.degraded++
      return true
    },
    destroy() {
      r.destroyed = true
    },
  }
  return r
}

/** Tres escenas de 1000 px apiladas; `top` en coordenadas de documento. */
function film() {
  const root = document.createElement("div")
  const tops: Record<string, number> = { hero: 0, chat: 1000, close: 2000 }
  for (const [scene, top] of Object.entries(tops)) {
    const s = document.createElement("section")
    s.dataset.scene = scene
    Object.defineProperty(s, "offsetHeight", { value: 1000 })
    s.getBoundingClientRect = () => ({ top: top - scroll, bottom: top + 1000 - scroll, left: 0, right: 1440, width: 1440, height: 1000, x: 0, y: top - scroll, toJSON() {} })
    root.append(s)
  }
  root.getBoundingClientRect = () => ({ top: -scroll, bottom: 3000 - scroll, left: 0, right: 1440, width: 1440, height: 3000, x: 0, y: -scroll, toJSON() {} })
  document.body.append(root)
  return root
}

const path: ThreadPath = {
  enabled: true,
  desktop: [
    { scene: "hero", points: [{ x: 90, y: 20, brand: 1 }, { x: 80, y: 90, brand: 1 }] },
    { scene: "chat", points: [{ x: 10, y: 50, ignite: true }, { x: 50, y: 100 }] },
    { scene: "close", points: [{ x: 50, y: 40, brand: 1, ignite: true }] },
  ],
  mobile: [],
}

let scroll = 0

function setup(over: Partial<ThreadOptions> = {}) {
  const root = film()
  const renderer = fakeRenderer()
  const thread = createThread({
    root,
    getScroll: () => scroll,
    getPin: () => null,
    isDesktop: () => true,
    path,
    createRenderer: () => renderer,
    ...over,
  })
  thread.refresh()
  return { root, renderer, thread }
}

beforeEach(() => {
  scroll = 0
  document.body.innerHTML = ""
  Object.defineProperty(window, "innerHeight", { value: VH, configurable: true })
  Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true })
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: false, media: q })) as unknown as typeof window.matchMedia
})

describe("createThread", () => {
  it("monta un canvas decorativo al principio de la película", () => {
    const { root } = setup()
    const canvas = root.firstElementChild as HTMLCanvasElement
    expect(canvas.tagName).toBe("CANVAS")
    expect(canvas.getAttribute("aria-hidden")).toBe("true")
    expect(canvas.classList.contains("film-thread")).toBe(true)
  })

  it("solo dibuja cuando cambia el scroll", () => {
    const { renderer, thread } = setup()
    thread.frame()
    expect(renderer.frames).toHaveLength(1)
    thread.frame()
    thread.frame()
    expect(renderer.frames).toHaveLength(1)
    scroll = 300
    thread.frame()
    expect(renderer.frames).toHaveLength(2)
    expect(renderer.frames[1].scroll).toBe(300)
  })

  it("un refresh (fuentes, cambio de ventana) obliga a redibujar aunque el scroll no cambie", () => {
    const { renderer, thread } = setup()
    thread.frame()
    thread.refresh()
    thread.frame()
    expect(renderer.frames).toHaveLength(2)
  })

  it("enciende la escena cuando la luz llega a su ancla, y la apaga al volver", () => {
    const { root, thread } = setup()
    const chat = root.querySelector<HTMLElement>('[data-scene="chat"]')!
    thread.frame()
    expect(chat.hasAttribute("data-thread-lit")).toBe(false)
    // El ancla de «chat» (y = 50 %) cruza la cabeza (62 % de 1000) en 1000 + 500 − 620.
    scroll = 880
    thread.frame()
    expect(chat.hasAttribute("data-thread-lit")).toBe(true)
    scroll = 800
    thread.frame()
    expect(chat.hasAttribute("data-thread-lit")).toBe(false)
  })

  it("entrega al renderer una columna con cabeza mientras la luz va en camino", () => {
    const { renderer, thread } = setup()
    scroll = 500
    thread.frame()
    const f = renderer.frames[0]
    expect(f.head).toBe(true)
    expect(f.spineLength).toBeGreaterThan(0)
    expect(f.sampleCount).toBeGreaterThan(1)
  })

  it("avisa dónde va la cabeza y qué fracción de su escena recorrió", () => {
    const onHead = jest.fn()
    const { thread } = setup({ onHead })
    scroll = 500
    thread.frame()
    expect(onHead).toHaveBeenCalledWith(expect.any(String), { x: expect.any(Number), y: expect.any(Number) }, expect.any(Number))
  })

  it("pasada la película el canvas se apaga y deja de dibujar", () => {
    const { root, renderer, thread } = setup()
    const canvas = root.querySelector("canvas")!
    scroll = 3200
    thread.frame()
    expect(canvas.hasAttribute("data-off")).toBe(true)
    expect(renderer.cleared).toBe(1)
    expect(renderer.frames).toHaveLength(0)
    scroll = 2500
    thread.frame()
    expect(canvas.hasAttribute("data-off")).toBe(false)
    expect(renderer.frames).toHaveLength(1)
  })

  it("baja de calidad tras una racha de frames lentos, no por uno suelto", () => {
    const now = jest.spyOn(performance, "now")
    const { renderer, thread } = setup()
    let t = 0
    const step = (ms: number) => {
      t += ms
      now.mockReturnValue(t)
      scroll += 1
      thread.frame()
    }
    step(16)
    step(60)
    expect(renderer.degraded).toBe(0)
    for (let i = 0; i < 50; i++) step(40)
    expect(renderer.degraded).toBe(1)
    now.mockRestore()
  })

  it("al destruirse quita el canvas, los encendidos y avisa al renderer", () => {
    const { root, renderer, thread } = setup()
    scroll = 880
    thread.frame()
    thread.destroy()
    expect(root.querySelector("canvas")).toBeNull()
    expect(root.querySelector("[data-thread-lit]")).toBeNull()
    expect(renderer.destroyed).toBe(true)
  })

  it("apagado por datos (`enabled: false`) no monta nada", () => {
    const root = film()
    const createRenderer = jest.fn()
    const thread = createThread({ root, getScroll: () => 0, getPin: () => null, isDesktop: () => true, path: { ...path, enabled: false }, createRenderer })
    thread.refresh()
    thread.frame()
    expect(createRenderer).not.toHaveBeenCalled()
    expect(root.querySelector("canvas")).toBeNull()
  })

  it("sin renderer posible (ni WebGL ni 2D) tampoco monta nada", () => {
    const root = film()
    const thread = createThread({ root, getScroll: () => 0, getPin: () => null, isDesktop: () => true, path, createRenderer: () => null })
    thread.refresh()
    thread.frame()
    thread.destroy()
    expect(root.querySelector("canvas")).toBeNull()
  })
})
