/**
 * Ronda 2: R4 (el motor llega a mitad de página: lo que ya se ve no vuelve al
 * inicio de su scrub) y R6 (si una escena cabe o no se vuelve a preguntar).
 */
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { pinFits, sceneTimeline, type Ctx } from "../film-kit"

gsap.registerPlugin(ScrollTrigger)

function scene(name: string, height: number) {
  const s = document.createElement("section")
  s.dataset.scene = name
  s.innerHTML = `<p data-anim="x" style="opacity:1">hola</p>`
  Object.defineProperty(s, "offsetHeight", { configurable: true, get: () => height })
  document.body.appendChild(s)
  return s
}

beforeEach(() => {
  document.body.innerHTML = ""
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 })
})

describe("pinFits (R6)", () => {
  it("se fija en escritorio si está en la lista y cabe; con la ventana más baja, ya no", () => {
    const s = scene("chat", 880)
    expect(pinFits(s, true)).toBe(true)
    expect(pinFits(s, false)).toBe(false)
    expect(pinFits(scene("pricing", 500), true)).toBe(false)
    // Solo cambia el alto de la ventana: 900 → 720.
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 720 })
    expect(pinFits(s, true)).toBe(false)
  })
})

describe("escena ya en pantalla al llegar el motor (R4)", () => {
  it("sin fijar y en pantalla: sin scrub, y el motor la lleva al fotograma final", () => {
    const s = scene("pricing", 600)
    const finals: gsap.core.Timeline[] = []
    const ctx: Ctx = { desktop: false, pins: new Map(), settled: new Set([s]), finals }
    const tl = sceneTimeline(s, ctx, 100)
    const el = s.querySelector<HTMLElement>("[data-anim=x]")!
    tl.fromTo(el, { opacity: 0 }, { opacity: 1 })
    expect(tl.scrollTrigger).toBeUndefined()
    expect(finals).toEqual([tl])
    finals[0].progress(1)
    expect(el.style.opacity).toBe("1")
  })

  it("fuera de pantalla (o sin llegar tarde): con su scrub de siempre", () => {
    const s = scene("pricing", 600)
    const finals: gsap.core.Timeline[] = []
    const ctx: Ctx = { desktop: false, pins: new Map(), settled: new Set(), finals }
    const tl = sceneTimeline(s, ctx, 100)
    expect(tl.scrollTrigger).toBeDefined()
    expect(finals).toEqual([])
    tl.scrollTrigger?.kill()
  })
})
