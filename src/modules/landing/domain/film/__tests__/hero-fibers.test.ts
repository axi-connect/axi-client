/**
 * Las fibras del hero A (plan §14): geometría determinista, que llega al nudo y
 * que se recoge con el scroll. El nudo es la primera ancla del hilo: si se mueve,
 * el hilo nace en otro sitio.
 */
import {
  FIBER_COUNT,
  HERO_TIMING,
  LABEL_COUNT,
  fiberPoint,
  fiberSegment,
  fiberState,
  heroFibers,
  knotOf,
  knotState,
} from "../hero-fibers"
import { FILM_THREAD } from "../thread-path"

const DESK = { width: 1440, height: 900, desktop: true }
const MOB = { width: 390, height: 844, desktop: false }

describe("heroFibers", () => {
  it("56 fibras en escritorio y 30 en móvil, iguales en cada visita", () => {
    expect(heroFibers(DESK)).toHaveLength(FIBER_COUNT.desktop)
    expect(heroFibers(MOB)).toHaveLength(FIBER_COUNT.mobile)
    expect(heroFibers(DESK)).toEqual(heroFibers(DESK))
  })

  it("cada fibra nace fuera de la ventana, por un borde, y termina en el nudo", () => {
    for (const layout of [DESK, MOB]) {
      const knot = knotOf(layout)
      for (const f of heroFibers(layout)) {
        const outside = f.from.x < 0 || f.from.x > layout.width || f.from.y > layout.height
        expect(outside).toBe(true)
        expect(fiberPoint(f, knot, 1)).toEqual(knot)
        expect(fiberPoint(f, knot, 0)).toEqual(f.from)
      }
    }
  })

  it("grosor, opacidad y tiempos dentro de lo aprobado", () => {
    for (const f of heroFibers(DESK)) {
      expect(f.width).toBeGreaterThanOrEqual(0.5)
      expect(f.width).toBeLessThanOrEqual(1.2)
      expect(f.alpha).toBeGreaterThanOrEqual(0.1)
      expect(f.alpha).toBeLessThanOrEqual(0.32)
      expect(f.delay).toBeGreaterThanOrEqual(0.1)
      expect(f.delay + HERO_TIMING.travel).toBeLessThanOrEqual(2.2)
    }
  })

  it("ocho preguntas solo en escritorio, y solo en fibras de los laterales", () => {
    const labeled = heroFibers(DESK).filter((f) => f.label !== null)
    expect(labeled).toHaveLength(LABEL_COUNT)
    expect(new Set(labeled.map((f) => f.label)).size).toBe(LABEL_COUNT)
    for (const f of labeled) expect(f.from.x < 0 || f.from.x > DESK.width).toBe(true)
    expect(heroFibers(MOB).some((f) => f.label !== null)).toBe(false)
  })
})

describe("el nudo es la primera ancla del hilo", () => {
  it("escritorio y móvil", () => {
    const first = (list: typeof FILM_THREAD.desktop) => {
      const hero = list.find((s) => s.scene === "hero")
      return hero && "points" in hero && hero.points ? hero.points[0] : null
    }
    const d = first(FILM_THREAD.desktop)
    const m = first(FILM_THREAD.mobile)
    expect(d && { x: d.x, y: d.y }).toEqual({ x: 50, y: 68 })
    expect(m && { x: m.x, y: m.y }).toEqual({ x: 50, y: 69 })
    expect(knotOf(DESK)).toEqual({ x: 720, y: 612 })
  })
})

describe("fiberSegment", () => {
  it("el subtramo empieza y acaba en la curva", () => {
    const knot = knotOf(DESK)
    const f = heroFibers(DESK)[3]
    const s = fiberSegment(f, knot, 0.25, 0.8)
    expect(s.start).toEqual(fiberPoint(f, knot, 0.25))
    expect(s.end).toEqual(fiberPoint(f, knot, 0.8))
    // El punto medio de la subcurva cae en la curva original (t = 0,525).
    const mid = { x: 0.25 * s.start.x + 0.5 * s.control.x + 0.25 * s.end.x, y: 0.25 * s.start.y + 0.5 * s.control.y + 0.25 * s.end.y }
    const want = fiberPoint(f, knot, 0.525)
    expect(mid.x).toBeCloseTo(want.x, 6)
    expect(mid.y).toBeCloseTo(want.y, 6)
  })
})

describe("coreografía", () => {
  const f = heroFibers(DESK)[0]

  it("antes de nacer no se ve; al final de la entrada llegó entera", () => {
    expect(fiberState(f, 0, 0).to).toBe(0)
    const end = fiberState(f, HERO_TIMING.end, 0)
    expect(end).toMatchObject({ from: 0, to: 1, head: false })
  })

  it("con el scroll se recoge en el nudo: a 0,65 ya no queda fibra", () => {
    expect(fiberState(f, HERO_TIMING.end, 0.3).from).toBeGreaterThan(0)
    expect(fiberState(f, HERO_TIMING.end, 0.65).from).toBe(1)
    // Recoger no puede adelantar a la fibra que todavía viaja.
    const early = fiberState(f, f.delay + 0.2, 0.5)
    expect(early.from).toBeLessThanOrEqual(early.to)
  })

  it("la pregunta aparece al nacer y se apaga cuando la fibra llega (tiempos del lienzo)", () => {
    expect(fiberState(f, f.delay + 0.5, 0).label).toBeGreaterThan(0.9)
    expect(fiberState(f, f.delay + HERO_TIMING.travel, 0).label).toBeLessThan(0.6)
    expect(fiberState(f, f.delay + HERO_TIMING.labelOut[1], 0).label).toBe(0)
  })

  it("el nudo se enciende de 30 a 140; al salir baja, encoge y se apaga", () => {
    const knot = knotOf(DESK)
    expect(knotState(knot, 0, 0)).toMatchObject({ r: 30, alpha: 0 })
    expect(knotState(knot, 3, 0)).toMatchObject({ y: 612, r: 140, alpha: 1 })
    expect(knotState(knot, 3, 1)).toMatchObject({ y: 942, r: 80, alpha: 0 })
  })
})
