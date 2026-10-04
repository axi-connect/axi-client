/**
 * El embudo de «Medir»: las fibras que se ven cuentan lo mismo que las cifras.
 */
import { FILM_CONTENT } from "../film-content"
import { FILM_NICHES } from "../niches"
import { FUNNEL_DESKTOP, FUNNEL_MOBILE, funnelKeep, funnelPaths, parseFigure } from "../funnel-fibers"

const subpaths = (d: string) => (d ? d.split("M").filter((s) => s.trim()).length : 0)

describe("funnelKeep", () => {
  it("proporcional a las cifras y nunca creciente", () => {
    expect(funnelKeep([1240, 312, 148, 121], 56)).toEqual([56, 14, 7, 5])
    expect(funnelKeep([100, 100, 200, 0], 10)).toEqual([10, 10, 10, 1])
  })
})

describe("funnelPaths", () => {
  it("una fibra por conversación: las que llegan más las que se apagan", () => {
    for (const layout of [FUNNEL_DESKTOP, FUNNEL_MOBILE]) {
      const counts = [1240, 312, 148, 121]
      const keep = funnelKeep(counts, layout.fibers)
      const { lost, won, dots } = funnelPaths(layout, counts)
      expect(subpaths(won)).toBe(keep[3])
      expect(subpaths(lost)).toBe(layout.fibers - keep[3])
      expect(subpaths(dots)).toBe(layout.fibers - keep[3])
    }
  })

  it("determinista y dentro del lienzo", () => {
    const a = funnelPaths(FUNNEL_DESKTOP, [3480, 2310, 1920, 1804])
    expect(a).toEqual(funnelPaths(FUNNEL_DESKTOP, [3480, 2310, 1920, 1804]))
    const { x, y, w, h } = FUNNEL_DESKTOP.view
    const nums = `${a.lost} ${a.won}`.match(/-?\d+(\.\d+)?/g)!.map(Number)
    for (let i = 0; i + 1 < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThanOrEqual(x)
      expect(nums[i]).toBeLessThanOrEqual(x + w)
      expect(nums[i + 1]).toBeGreaterThanOrEqual(y)
      expect(nums[i + 1]).toBeLessThanOrEqual(y + h)
    }
  })

  it("cada nicho dibuja su embudo desde sus cifras", () => {
    for (const n of FILM_NICHES) {
      const counts = FILM_CONTENT[n].measure.steps.map(([, v]) => parseFigure(v))
      expect(counts.every((c, i) => i === 0 || c <= counts[i - 1])).toBe(true)
      expect(subpaths(funnelPaths(FUNNEL_DESKTOP, counts).won)).toBeGreaterThan(0)
    }
  })
})

describe("parseFigure", () => {
  it("miles con punto y millones con coma", () => {
    expect(parseFigure("1.240")).toBe(1240)
    expect(parseFigure("$ 48,6 M")).toBeCloseTo(48_600_000)
    expect(parseFigure("$ 4.899.000")).toBe(4_899_000)
  })
})
