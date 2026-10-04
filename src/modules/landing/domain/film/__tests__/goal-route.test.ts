/**
 * La meta (plan §16.1): la ruta en rejilla, su muestreo y la cámara que la
 * mira. Lo que se comprueba aquí es lo que el visitante ve: que el coche va
 * por las calles, que una fracción de la meta es esa fracción del camino y que
 * las marcas HTML caen exactamente donde el plano 3D pinta la ruta.
 */
import {
  GOAL_CORNER_RADIUS,
  GOAL_ROUTE,
  GOAL_ROUTE_PATH,
  GOAL_WAYPOINTS,
  goalCityBlocks,
  goalPointAt,
  goalSlicePath,
  sampleGoalRoute,
} from "../route-map"
import { GOAL_PERSPECTIVE, carFraction, dashWindow, goalCamera, goalFrame, heading, planeTransform, project } from "../goal-camera"
import { ROUTE_FRACTIONS } from "../route-scenario"

const close = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps

describe("la ruta en rejilla", () => {
  it("empieza en la salida y acaba en la bandera", () => {
    expect(goalPointAt(0)).toEqual(GOAL_WAYPOINTS[0])
    const end = goalPointAt(1)
    const last = GOAL_WAYPOINTS[GOAL_WAYPOINTS.length - 1]
    expect(close(end.x, last.x) && close(end.y, last.y)).toBe(true)
  })

  it("va por los ejes de las calles (k·100 − 9) salvo en las esquinas redondeadas", () => {
    for (const pt of GOAL_ROUTE.points) {
      const onStreetX = close(((pt.x + 9) % 100 + 100) % 100, 0, 0.01) || close(((pt.x + 9) % 100 + 100) % 100, 100, 0.01)
      const onStreetY = close(((pt.y + 9) % 100 + 100) % 100, 0, 0.01) || close(((pt.y + 9) % 100 + 100) % 100, 100, 0.01)
      if (onStreetX || onStreetY) continue
      // Fuera de una calle solo se está dentro de una curva: a menos de r de un vértice.
      const nearCorner = GOAL_WAYPOINTS.some((w) => Math.hypot(w.x - pt.x, w.y - pt.y) <= GOAL_CORNER_RADIUS + 0.01)
      expect(nearCorner).toBe(true)
    }
  })

  it("las esquinas son curvas: ningún punto muestreado cae en un vértice interior", () => {
    for (const w of GOAL_WAYPOINTS.slice(1, -1)) {
      const nearest = Math.min(...GOAL_ROUTE.points.map((p) => Math.hypot(p.x - w.x, p.y - w.y)))
      expect(nearest).toBeGreaterThan(GOAL_CORNER_RADIUS * 0.2)
    }
  })

  it("una fracción de la meta es esa fracción del camino (longitud de arco)", () => {
    const { lengths, total } = GOAL_ROUTE
    for (let i = 1; i < lengths.length; i++) expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1])
    // Medir el camino hasta goalPointAt(f) con el mismo muestreo da f·total.
    for (const f of [0.1, ROUTE_FRACTIONS.done, ROUTE_FRACTIONS.expected, 0.9]) {
      const partial = sampleGoalRoute().total * f
      const p = goalPointAt(f)
      const i = GOAL_ROUTE.lengths.findIndex((l) => l >= partial)
      const a = GOAL_ROUTE.points[i - 1]
      expect(Math.hypot(p.x - a.x, p.y - a.y)).toBeLessThanOrEqual(GOAL_ROUTE.lengths[i] - GOAL_ROUTE.lengths[i - 1] + 1e-6)
    }
    expect(total).toBeGreaterThan(2000)
  })

  it("avanzar en la meta siempre avanza hacia la bandera (x no baja, y no sube)", () => {
    let last = goalPointAt(0)
    for (let f = 0.01; f <= 1; f += 0.01) {
      const p = goalPointAt(f)
      expect(p.x).toBeGreaterThanOrEqual(last.x - 1e-6)
      expect(p.y).toBeLessThanOrEqual(last.y + 1e-6)
      last = p
    }
  })

  it("slice: un tramo empieza y acaba en sus fracciones, y uno vacío no dibuja nada", () => {
    const d = goalSlicePath(ROUTE_FRACTIONS.done, ROUTE_FRACTIONS.projected)
    const a = goalPointAt(ROUTE_FRACTIONS.done)
    const b = goalPointAt(ROUTE_FRACTIONS.projected)
    expect(d.startsWith(`M ${a.x.toFixed(1)} ${a.y.toFixed(1)}`)).toBe(true)
    expect(d.endsWith(`L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`)).toBe(true)
    expect(goalSlicePath(0.5, 0.5)).toBe("")
    expect(goalSlicePath(0.7, 0.6)).toBe("")
    expect(GOAL_ROUTE_PATH).toBe(goalSlicePath(0, 1))
  })

  it("la ciudad es determinista, con huecos y algunos parques", () => {
    const a = goalCityBlocks()
    expect(goalCityBlocks()).toEqual(a)
    expect(a.length).toBeGreaterThan(300)
    expect(a.length).toBeLessThan(360)
    const parks = a.filter((b) => b.park).length
    expect(parks).toBeGreaterThan(5)
    expect(parks).toBeLessThan(40)
    for (const b of a) expect(b.w <= 82 && b.h <= 82).toBe(true)
  })
})

/* ── la cámara: la matriz CSS y `project` dicen lo mismo ── */

type M = number[] // 4×4 en orden de columnas, como CSS
const mul = (a: M, b: M): M => {
  const o = new Array(16).fill(0)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]
  return o
}
const translate = (x: number, y: number): M => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, 0, 1]
const scale = (s: number): M => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const rotX = (deg: number): M => {
  const a = (deg * Math.PI) / 180
  return [1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1]
}
const rotZ = (deg: number): M => {
  const a = (deg * Math.PI) / 180
  return [Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}
const perspective = (d: number): M => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / d, 0, 0, 0, 1]
const apply = (m: M, x: number, y: number) => {
  const X = m[0] * x + m[4] * y + m[12]
  const Y = m[1] * x + m[5] * y + m[13]
  const W = m[3] * x + m[7] * y + m[15]
  return { x: X / W, y: Y / W }
}

describe("la cámara", () => {
  it("pone el centro de la cámara en el foco", () => {
    for (const p of [0, 0.3, 0.65, 1]) {
      const cam = goalCamera(p)
      const at = project(cam, cam.center)
      expect(close(at.x, 0, 1e-6) && close(at.y, 0, 1e-6)).toBe(true)
    }
  })

  it("`project` coincide con la matriz CSS del plano (con la perspectiva en el foco)", () => {
    for (const p of [0.05, 0.3, 0.66, 0.95]) {
      const cam = goalCamera(p)
      // perspective(d) · rotateX · rotateZ · scale · translate(−c); el foco es el origen.
      const m = [rotX(cam.tilt), rotZ(cam.turn), scale(cam.scale), translate(-cam.center.x, -cam.center.y)].reduce(
        (acc, t) => mul(acc, t),
        perspective(GOAL_PERSPECTIVE),
      )
      for (const f of [0, 0.4, ROUTE_FRACTIONS.done, 0.82, 1]) {
        const w = goalPointAt(f)
        const css = apply(m, w.x, w.y)
        const ours = project(cam, w)
        expect(close(css.x, ours.x, 0.01) && close(css.y, ours.y, 0.01)).toBe(true)
      }
    }
  })

  it("el transform del plano lleva la misma cadena, en el orden del plan", () => {
    const cam = goalCamera(0.3)
    expect(planeTransform(cam)).toMatch(/^rotateX\(52\.00deg\) rotateZ\(-7\.00deg\) scale\(1\.0000\) translate\(-[\d.]+px, -[\d.]+px\)$/)
  })

  it("los tramos de la tabla: baja sobre la ciudad, sigue al coche y se aleja", () => {
    const start = goalCamera(0)
    expect([start.tilt, start.scale, start.turn]).toEqual([0, 0.42, 0])
    expect(start.center).toEqual({ x: 1200, y: 750 })
    const follow = goalCamera(0.3)
    expect([follow.tilt, follow.scale, follow.turn]).toEqual([52, 1, -7])
    const car = goalPointAt(carFraction(0.3))
    expect(close(follow.center.x, car.x, 1e-6) && close(follow.center.y, car.y, 1e-6)).toBe(true)
    const far = goalCamera(0.8)
    expect(close(far.tilt, 42, 1e-9) && close(far.scale, 0.66, 1e-9)).toBe(true)
  })

  it("el coche llega al 63 % en 0,5 y no se mueve antes de 0,12", () => {
    expect(carFraction(0)).toBe(0)
    expect(carFraction(0.12)).toBe(0)
    expect(carFraction(0.5)).toBeCloseTo(ROUTE_FRACTIONS.done, 9)
    expect(carFraction(1)).toBeCloseTo(ROUTE_FRACTIONS.done, 9)
  })

  it("el coche apunta hacia donde sigue la ruta en pantalla", () => {
    const cam = goalCamera(0.3)
    const f = carFraction(0.3)
    const a = project(cam, goalPointAt(f))
    const b = project(cam, goalPointAt(f + 0.01))
    const deg = heading(cam, f)
    const dir = { x: Math.sin((deg * Math.PI) / 180), y: -Math.cos((deg * Math.PI) / 180) }
    const v = { x: b.x - a.x, y: b.y - a.y }
    const cos = (dir.x * v.x + dir.y * v.y) / Math.hypot(v.x, v.y)
    expect(cos).toBeGreaterThan(0.999)
  })
})

describe("el fotograma", () => {
  it("dashWindow revela el tramo pedido sobre pathLength=1", () => {
    expect(dashWindow(0, 0.63)).toBe("0.6300 2")
    expect(dashWindow(0.63, 0.82)).toBe("0 0.6300 0.1900 2")
    // Un tramo sin largo no pinta (casi) nada, pero sigue siendo un patrón válido.
    expect(dashWindow(0.63, 0.63)).toBe("0 0.6300 0.0001 2")
  })

  it("el final (lo que pinta el servidor) es la ruta de Axi aprobada al 91 %", () => {
    const f = goalFrame(1)
    expect(f.approved).toBe(true)
    expect(f.arrive).toBeCloseTo(ROUTE_FRACTIONS.projectedWithRoute, 9)
    expect(f.car).toBeCloseTo(ROUTE_FRACTIONS.done, 9)
    expect(f.recalc).toBe(0)
    expect(f.projection).toBe(0)
    expect(f.button).toBe(1)
    expect(f.dash.axi).toBe(dashWindow(ROUTE_FRACTIONS.done, ROUTE_FRACTIONS.projectedWithRoute))
  })

  it("antes de aprobar, la llegada es la del ritmo de hoy (82 %) y el botón se hunde", () => {
    const f = goalFrame(0.835)
    expect(f.approved).toBe(false)
    expect(f.arrive).toBe(ROUTE_FRACTIONS.projected)
    expect(f.button).toBeLessThan(1)
    expect(f.button).toBeGreaterThanOrEqual(0.94)
  })

  it("las marcas salen de la misma cámara que el plano", () => {
    const f = goalFrame(0.4)
    const car = project(f.cam, goalPointAt(f.car))
    expect(f.marks.car).toEqual(car)
  })
})
