/**
 * El guion de lectura de la meta (dueña, 2026-10-01): mesetas en cada momento
 * clave, con todo entero (ningún fundido congelado a medias) y vuelo entre ellas.
 */
import { goalFrame } from "../goal-camera"
import { GOAL_PLATEAUS, goalStory } from "../goal-story"
import { ROUTE_FRACTIONS } from "../route-scenario"
import { storyAt, storyPlateaus } from "../story"

const mid = (a: number, b: number) => (a + b) / 2
/** Las opacidades del fotograma (lo que se ve), sin el pulso, que va ligado al scroll. */
const OPACITIES = ["carMark", "here", "start", "should", "slowChip", "ring", "flag", "routeNow", "routeAxi", "recalc", "axiGlow", "projection"] as const

describe("las mesetas de la meta", () => {
  it("en mitad de cada meseta la historia está quieta y su momento, entero", () => {
    expect(GOAL_PLATEAUS.map(([, , s]) => s)).toEqual([0.2, 0.58, 0.7, 0.8, 0.9, 1])
    for (const [a, b, s] of GOAL_PLATEAUS) {
      expect(goalStory(mid(a, b))).toBe(s)
      expect(goalStory(a + 1e-6)).toBe(s)
      expect(goalStory(b - 1e-6)).toBe(s)
      // Ningún fundido a medias: cada opacidad está asentada en ese instante.
      const here = goalFrame(s)
      const near = goalFrame(Math.max(0, s - 0.004))
      for (const k of OPACITIES) expect([k, Math.abs(here[k] - near[k]) < 0.02]).toEqual([k, true])
    }
    // Lo que cuenta cada meseta.
    const [, slow, , axi, ok] = GOAL_PLATEAUS.map(([, , s]) => goalFrame(s))
    expect(slow.car).toBeCloseTo(ROUTE_FRACTIONS.done, 5)
    expect(slow.slowChip).toBe(1)
    expect([axi.routeAxi, axi.approved]).toEqual([1, false])
    expect(ok.approved).toBe(true)
  })

  it("entre mesetas la historia avanza (y el coche, en su tramo)", () => {
    let from = 0
    for (const [a, b] of GOAL_PLATEAUS) {
      const m = mid(from, a)
      expect(goalStory(m + 0.002)).toBeGreaterThan(goalStory(m))
      from = b
    }
    // En mitad del primer tramo largo el coche va entre la salida y donde se detiene.
    const m = mid(GOAL_PLATEAUS[0][1], GOAL_PLATEAUS[1][0])
    const car = goalFrame(goalStory(m)).car
    expect(car).toBeGreaterThan(0.05)
    expect(car).toBeLessThan(ROUTE_FRACTIONS.done - 0.02)
  })

  it("cada meseta es al menos el 40 % de su tramo y la última llega antes de soltar", () => {
    let from = 0
    for (const [a, b] of GOAL_PLATEAUS) {
      expect((b - a) / (b - from)).toBeGreaterThanOrEqual(0.4)
      from = b
    }
    expect(GOAL_PLATEAUS.at(-1)![0]).toBeLessThan(0.95)
    expect(goalStory(1)).toBe(1)
  })
})

describe("story (el reparto de mesetas, compartido con el piloto)", () => {
  it("reparte el scroll por pesos y es continuo y monótono", () => {
    const pl = storyPlateaus([[0, 0, 0], [0.5, 1, 1], [1, 1, 1]])
    expect(pl).toEqual([[0.25, 0.5, 0.5], [0.75, 1, 1]])
    let prev = 0
    for (let i = 1; i <= 500; i++) {
      const s = storyAt(i / 500, pl)
      expect(s).toBeGreaterThanOrEqual(prev)
      expect(s - prev).toBeLessThan(0.02)
      prev = s
    }
  })
})
