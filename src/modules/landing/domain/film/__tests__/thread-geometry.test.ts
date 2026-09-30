/**
 * El hilo de luz: cuándo llega la luz a cada ancla, dónde está cada escena en
 * pantalla y la columna del haz que recibe el renderer. Todo es aritmética, así
 * que se prueba con números a mano y en los dos sentidos (antes y después del pin,
 * cabeza y cola).
 */
import { roadPointAt, MAP_HEIGHT, MAP_WIDTH } from "../route-map"
import { ROUTE_FRACTIONS } from "../route-scenario"
import {
  HEAD_AT,
  headAt,
  resampleSpine,
  sampleLit,
  sceneFraction,
  sceneTop,
  timeAnchors,
  type Sample,
  type SceneMeasure,
  type SceneThread,
} from "../thread-geometry"
import { FILM_THREAD } from "../thread-path"

const VH = 1000
const HEAD = VH * HEAD_AT // 620

const measures: Record<string, SceneMeasure> = {
  a: { top: 0, width: 1440, height: 1000, pin: null },
  b: { top: 1000, width: 1440, height: 1000, pin: { start: 1000, end: 3000 } },
  c: { top: 4000, width: 1440, height: 1000, pin: null },
}
const measure = (scene: string) => measures[scene] ?? null

const path: SceneThread[] = [
  { scene: "a", points: [{ x: 50, y: 70 }, { x: 50, y: 100 }] },
  { scene: "b", points: [{ x: 10, y: 40 }, { x: 20, y: 90, ignite: true }] },
  { scene: "c", points: [{ x: 80, y: 80, brand: 1 }] },
]

describe("timeAnchors", () => {
  const anchors = timeAnchors(path, measure, VH)

  it("en una escena libre, la luz llega cuando el ancla cruza la línea de la cabeza", () => {
    expect(anchors[1].at).toBe(1000 - HEAD)
    expect(anchors[4].at).toBe(4000 + 800 - HEAD)
  })

  it("el primer tramo ya se ve al cargar", () => {
    expect(anchors[0].at).toBeLessThanOrEqual(-1)
  })

  it("en una escena fijada, el ancla que está sobre la cabeza llega antes del pin", () => {
    // 1000 + 400 − 620 = 780: antes de que el pin empiece (1000).
    expect(anchors[2].at).toBe(780)
    expect(anchors[2].at).toBeLessThan(measures.b.pin!.start)
  })

  it("y la que está bajo la cabeza avanza con el progreso del pin, sin llegar a soltarlo", () => {
    const at = anchors[3].at
    expect(at).toBeGreaterThan(measures.b.pin!.start)
    expect(at).toBeLessThan(measures.b.pin!.end)
    // (900 − 620) / (1000 − 620) del pin, al 92 %.
    expect(at).toBeCloseTo(1000 + ((900 - 620) / 380) * 2000 * 0.92, 5)
  })

  it("los tiempos crecen estrictamente aunque dos anclas caigan en el mismo scroll", () => {
    const same = timeAnchors(
      [{ scene: "a", points: [{ x: 0, y: 80 }, { x: 10, y: 80 }, { x: 20, y: 80 }] }],
      measure,
      VH,
    )
    expect(same[1].at).toBeGreaterThan(same[0].at)
    expect(same[2].at).toBeGreaterThan(same[1].at)
  })

  it("una escena que no está en la página no aporta anclas", () => {
    const only = timeAnchors([...path, { scene: "no-existe", points: [{ x: 1, y: 1 }] }], measure, VH)
    expect(only.map((a) => a.scene)).toEqual(["a", "a", "b", "b", "c"])
  })

  it("lleva la marca y el encendido de cada punto, y acota la marca a 0–1", () => {
    expect(anchors[3].ignite).toBe(true)
    expect(anchors[0].ignite).toBe(false)
    expect(anchors[4].brand).toBe(1)
    const wild = timeAnchors([{ scene: "a", points: [{ x: 0, y: 0, brand: 7 }] }], measure, VH)
    expect(wild[0].brand).toBe(1)
  })
})

describe("sceneTop", () => {
  it("libre: la caja sube con el scroll", () => {
    expect(sceneTop({ top: 4000, pin: null }, 3500)).toBe(500)
    expect(sceneTop({ top: 4000, pin: null }, 4500)).toBe(-500)
  })

  it("fijada: antes del pin sube, durante se queda en 0 y después sigue subiendo", () => {
    const pin = { start: 1000, end: 3000 }
    expect(sceneTop({ top: 1000, pin }, 400)).toBe(600)
    expect(sceneTop({ top: 1000, pin }, 1000)).toBe(0)
    expect(sceneTop({ top: 1000, pin }, 2200)).toBe(0)
    expect(sceneTop({ top: 1000, pin }, 3000)).toBe(0)
    expect(sceneTop({ top: 1000, pin }, 3300)).toBe(-300)
  })
})

describe("headAt y sceneFraction", () => {
  const anchors = timeAnchors(path, measure, VH)

  it("antes de la segunda ancla, la cabeza va del primer tramo", () => {
    expect(headAt(anchors, 0)).toEqual({ index: 0, u: expect.any(Number), done: false })
  })

  it("entre dos anclas, `u` es la fracción del camino", () => {
    const mid = (anchors[2].at + anchors[3].at) / 2
    const h = headAt(anchors, mid)
    expect(h.index).toBe(2)
    expect(h.u).toBeCloseTo(0.5, 5)
  })

  it("pasada la última, la luz terminó", () => {
    expect(headAt(anchors, 1e7)).toEqual({ index: 4, u: 1, done: true })
    expect(headAt([], 0).done).toBe(true)
  })

  it("la fracción de la escena cuenta solo sus propias anclas", () => {
    expect(sceneFraction(anchors, { index: 2, u: 0.5 })).toBeCloseTo(0.5, 5)
    expect(sceneFraction(anchors, { index: 3, u: 0.2 })).toBe(1)
    // Una escena de un solo punto está completa en cuanto llega.
    expect(sceneFraction(anchors, { index: 4, u: 0 })).toBe(1)
  })
})

describe("sampleLit", () => {
  const anchors = timeAnchors(path, measure, VH)
  const view = { width: 1000, height: VH }

  it("termina exactamente en la cabeza, a medio camino entre dos anclas", () => {
    const out: Sample[] = []
    const scroll = (anchors[1].at + anchors[2].at) / 2
    const head = headAt(anchors, scroll)
    const n = sampleLit(anchors, scroll, view, head, out)
    expect(n).toBeGreaterThan(2)
    const first = out[0]
    // La primera muestra es la primera ancla en pantalla (x 50 % del ancho).
    expect(first.x).toBeCloseTo(500, 5)
    expect(first.y).toBeCloseTo(sceneTop(anchors[0], scroll) + 700, 5)
    // La última no pasa de la segunda ancla del tramo en curso.
    const tip = out[n - 1]
    const b = { x: anchors[2].x * 1000, y: sceneTop(anchors[2], scroll) + anchors[2].y * anchors[2].height }
    expect(Math.hypot(tip.x - b.x, tip.y - b.y)).toBeGreaterThan(1)
  })

  it("reutiliza el arreglo de salida entre frames", () => {
    const out: Sample[] = []
    const h = headAt(anchors, 500)
    sampleLit(anchors, 500, view, h, out)
    const ref = out[0]
    sampleLit(anchors, 600, view, headAt(anchors, 600), out)
    expect(out[0]).toBe(ref)
  })

  it("no muestrea los tramos que quedaron muy por encima de la pantalla", () => {
    const out: Sample[] = []
    const scroll = anchors[4].at - 10
    const n = sampleLit(anchors, scroll, view, headAt(anchors, scroll), out)
    // La primera ancla de «a» queda a −3470 px: ni ella ni su tramo con la segunda (−3170) se muestrean.
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) expect(out[i].y).toBeGreaterThan(-3200)
  })
})

describe("resampleSpine", () => {
  const line = (n: number): Sample[] => Array.from({ length: n }, (_, i) => ({ x: 0, y: i * 10, brand: i / (n - 1) }))

  it("va de la cola (índice 0) a la cabeza (último), a igual distancia", () => {
    const s = line(21) // 200 px de largo
    const out = new Float32Array(5 * 4)
    const len = resampleSpine(s, s.length, 5, 1000, out)
    expect(len).toBe(200)
    const ys = [0, 1, 2, 3, 4].map((k) => out[k * 4 + 1])
    expect(ys).toEqual([0, 50, 100, 150, 200])
    const dist = [0, 1, 2, 3, 4].map((k) => out[k * 4 + 3])
    expect(dist).toEqual([200, 150, 100, 50, 0])
  })

  it("no colapsa todos los puntos en la cola (regresión del prototipo)", () => {
    const s = line(21)
    const out = new Float32Array(8 * 4)
    resampleSpine(s, s.length, 8, 1000, out)
    const ys = new Set(Array.from({ length: 8 }, (_, k) => Math.round(out[k * 4 + 1])))
    expect(ys.size).toBe(8)
  })

  it("se corta a `maxLength` detrás de la cabeza", () => {
    const s = line(101) // 1000 px
    const out = new Float32Array(3 * 4)
    const len = resampleSpine(s, s.length, 3, 300, out)
    expect(len).toBeGreaterThanOrEqual(300)
    expect(len).toBeLessThan(320)
    expect(out[2 * 4 + 1]).toBe(1000) // la cabeza
    expect(out[1]).toBeGreaterThanOrEqual(680) // la cola, ~300 px antes
  })

  it("interpola la marca a lo largo del haz", () => {
    const s = line(11)
    const out = new Float32Array(3 * 4)
    resampleSpine(s, s.length, 3, 1000, out)
    expect(out[2]).toBeCloseTo(0, 5)
    expect(out[4 + 2]).toBeCloseTo(0.5, 5)
    expect(out[8 + 2]).toBeCloseTo(1, 5)
  })

  it("con menos de dos muestras no hay nada que dibujar", () => {
    expect(resampleSpine([{ x: 0, y: 0, brand: 0 }], 1, 4, 100, new Float32Array(16))).toBe(0)
  })
})

describe("FILM_THREAD", () => {
  it("cada variante recorre cada escena una sola vez", () => {
    for (const variant of [FILM_THREAD.desktop, FILM_THREAD.mobile]) {
      const scenes = variant.map((s) => s.scene)
      expect(new Set(scenes).size).toBe(scenes.length)
    }
  })

  it("la marca solo se abre del todo en la apertura, la meta y el cierre", () => {
    for (const variant of [FILM_THREAD.desktop, FILM_THREAD.mobile]) {
      for (const s of variant) {
        const pts = s.resolve ? s.resolve({ width: 1440, height: 900, viewportHeight: 900 }) : (s.points ?? [])
        for (const p of pts) {
          if ((p.brand ?? 0) >= 1) expect(["hero", "goal", "close"]).toContain(s.scene)
        }
      }
    }
  })

  it("en la meta el hilo termina sobre la carretera, en «vas aquí»", () => {
    const goal = FILM_THREAD.desktop.find((s) => s.scene === "goal")!
    // Una ventana 16:10 exacta: el mapa cubre la escena sin recortes.
    const pts = goal.resolve!({ width: 1440, height: 900, viewportHeight: 900 })
    const last = pts[pts.length - 1]
    const road = roadPointAt(ROUTE_FRACTIONS.done)
    expect(last.ignite).toBe(true)
    // Con 160svh (1440) el mapa mide justo la escena: los % son los del lienzo.
    expect(last.x).toBeCloseTo((road.x / MAP_WIDTH) * 100, 5)
    expect(last.y).toBeCloseTo((road.y / MAP_HEIGHT) * 100, 5)
  })

  it("en una ventana más ancha que 16:10, el mapa se recorta arriba y abajo y los puntos lo siguen", () => {
    const goal = FILM_THREAD.desktop.find((s) => s.scene === "goal")!
    const wide = goal.resolve!({ width: 2000, height: 900, viewportHeight: 900 })
    const road = roadPointAt(ROUTE_FRACTIONS.done)
    const mapH = (2000 * MAP_HEIGHT) / MAP_WIDTH
    const expectedY = (((900 - mapH) / 2 + (road.y / MAP_HEIGHT) * mapH) / 900) * 100
    expect(wide[wide.length - 1].y).toBeCloseTo(expectedY, 5)
  })
})
