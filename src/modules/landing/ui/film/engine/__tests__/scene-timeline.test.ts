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

describe("fijar siempre y caber (la dueña, 2026-10-01)", () => {
  it("en escritorio, una escena de la lista se fija aunque no quepa; en móvil o fuera de la lista, no", () => {
    expect(pinFits(scene("pilot", 1200), true)).toBe(true)
    expect(pinFits(scene("pilot", 1200), false)).toBe(false)
    expect(pinFits(scene("pricing", 500), true)).toBe(false)
  })

  it("si no cabe, su contenido en el flujo se escala hasta caber, aunque no encoja en proporción; si cabe, no se toca", () => {
    const tall = scene("goal", 0)
    const copy = tall.querySelector<HTMLElement>("[data-anim=x]")!
    // Como medir: 300 px no encogen con el zoom (altos ligados a la ventana) y 900 sí.
    Object.defineProperty(tall, "offsetHeight", { configurable: true, get: () => 300 + 900 * (Number(copy.style.zoom) || 1) })
    const map = document.createElement("div")
    map.style.position = "absolute"
    tall.prepend(map)
    sceneTimeline(tall, { desktop: true, pins: new Map() }, 100)
    // Cabe (con el aire de 0,985) y no se pasa de escala: el mínimo es 0,6.
    expect(tall.offsetHeight).toBeLessThanOrEqual(900)
    expect(Number(copy.style.zoom)).toBeGreaterThan(0.6)
    // El mapa de fondo (absoluto) ya llena la ventana: no se escala.
    expect(map.style.zoom || "").toBe("")
    expect(tall.parentElement?.classList.contains("pin-spacer")).toBe(true)
    const fits = scene("chat", 880)
    sceneTimeline(fits, { desktop: true, pins: new Map() }, 100)
    expect(fits.querySelector<HTMLElement>("[data-anim=x]")!.style.zoom || "").toBe("")
  })
})

describe("el contenido de una escena fijada no empieza bajo la isla (≥ 96 px)", () => {
  // Un texto cuyo borde sale a `at` px del de la escena más el relleno que se le dé.
  function at(px: number) {
    const s = scene("measure", 600)
    const copy = s.querySelector<HTMLElement>("[data-anim=x]")!
    copy.getClientRects = () => [{}] as unknown as DOMRectList
    copy.getBoundingClientRect = () => ({ top: px + (parseFloat(s.style.paddingTop) || 0) }) as DOMRect
    s.getBoundingClientRect = () => ({ top: 0 }) as DOMRect
    sceneTimeline(s, { desktop: true, pins: new Map() }, 100)
    return { s, top: copy.getBoundingClientRect().top }
  }

  it("si el contenido queda a 20 px, la escena gana relleno hasta 96", () => {
    const { s, top } = at(20)
    expect(top).toBeGreaterThanOrEqual(95.5)
    expect(parseFloat(s.style.paddingTop)).toBeCloseTo(76, 0)
  })

  it("si ya empieza a 120 px, no se toca", () => {
    const { s } = at(120)
    expect(s.style.paddingTop).toBe("")
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
