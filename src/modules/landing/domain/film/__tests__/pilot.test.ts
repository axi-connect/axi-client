/**
 * El piloto automático (plan §19): la aerovía, el vuelo y el guion. Lo que se
 * comprueba es lo que el visitante ve: que el avión pasa por los seis fijos en
 * orden, que espera sobre el de la política, que las marcas HTML caen donde el
 * plano pinta la ruta, y que las cifras de ejemplo cuadran en cada nicho.
 */
import {
  FLIGHT_CONTROL,
  FLIGHT_FIXES,
  FLIGHT_HOLD,
  FLIGHT_HOLD_FRACTION,
  FLIGHT_ROUTE,
  FLIGHT_ZONE_CENTER,
  flightLandscape,
  flightPointAt,
  holdPoint,
  zoneVertices,
} from "../flight-route"
import { project } from "../goal-camera"
import { FILM_NICHES } from "../niches"
import {
  FILM_FEATURES,
  PILOT_ANNUNCIATORS,
  PILOT_CONTENT,
  PILOT_COPY,
  PILOT_LOT,
  PILOT_RUN,
  PILOT_STAGES,
  PILOT_STATUS,
  lotCounts,
} from "../pilot-content"
import { PILOT_BOARD, boardRow, capSegments, dial, pilotCamera, pilotFrame, planeAt } from "../pilot-frame"

const close = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps
const RUN = { ...PILOT_RUN, approved: lotCounts(PILOT_LOT).approved }

describe("la aerovía", () => {
  it("sale de la torre, pasa por cada punto de control y llega al aeropuerto", () => {
    expect(flightPointAt(0)).toEqual(FLIGHT_CONTROL[0])
    const end = flightPointAt(1)
    const last = FLIGHT_CONTROL[FLIGHT_CONTROL.length - 1]
    expect(close(end.x, last.x) && close(end.y, last.y)).toBe(true)
    FLIGHT_CONTROL.forEach((c, k) => {
      const q = FLIGHT_ROUTE.points[k * 40]
      expect(close(q.x, c.x, 1e-6) && close(q.y, c.y, 1e-6)).toBe(true)
    })
  })

  it("los seis fijos van en orden, dentro de la ruta, y la espera es el quinto", () => {
    expect(FLIGHT_FIXES).toHaveLength(6)
    FLIGHT_FIXES.forEach((f, i) => {
      expect(f).toBeGreaterThan(0)
      expect(f).toBeLessThan(1)
      if (i) expect(f).toBeGreaterThan(FLIGHT_FIXES[i - 1])
    })
    expect(FLIGHT_HOLD_FRACTION).toBe(FLIGHT_FIXES[4])
    expect(PILOT_COPY.steps).toHaveLength(FLIGHT_FIXES.length)
  })

  it("rodea el espacio restringido: ninguna muestra de la ruta cae dentro del polígono", () => {
    const poly = zoneVertices()
    const inside = (x: number, y: number) => {
      let c = false
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]
        const b = poly[j]
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c
      }
      return c
    }
    expect(inside(FLIGHT_ZONE_CENTER.x, FLIGHT_ZONE_CENTER.y)).toBe(true)
    expect(FLIGHT_ROUTE.points.filter((q) => inside(q.x, q.y))).toHaveLength(0)
  })

  it("el circuito de espera es un óvalo de 128 × 68 que toca la ruta en el fijo 5", () => {
    const fix5 = FLIGHT_CONTROL[6]
    const bottom = holdPoint(0)
    expect(close(bottom.x, fix5.x) && close(bottom.y, fix5.y)).toBe(true)
    expect(holdPoint(Math.PI / 2).x - holdPoint(-Math.PI / 2).x).toBeCloseTo(2 * FLIGHT_HOLD.rx)
  })

  it("el paisaje se agrupa en pocas capas (el HTML pesa poco)", () => {
    const land = flightLandscape()
    expect(land.lights.length).toBeLessThanOrEqual(20)
    const dots = land.lights.reduce((n, l) => n + (l.d.match(/h0/g)?.length ?? 0), 0)
    expect(dots).toBe(8 * 22)
    land.lights.forEach((l) => {
      expect(l.opacity).toBeGreaterThanOrEqual(0.15)
      expect(l.opacity).toBeLessThanOrEqual(0.4)
    })
    expect(land.contours.match(/M/g)).toHaveLength(13)
  })
})

describe("el vuelo", () => {
  it("espera en la torre, avanza sin retroceder y aterriza", () => {
    expect(planeAt(0).f).toBe(0)
    expect(planeAt(0.1).f).toBe(0)
    let last = -1
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const f = planeAt(p).f
      expect(f).toBeGreaterThanOrEqual(last - 1e-9)
      last = f
    }
    expect(planeAt(0.9).f).toBe(1)
    expect(planeAt(1).f).toBe(1)
  })

  it("da una vuelta al circuito de espera entre 0,52 y 0,64 y vuelve al fijo 5", () => {
    expect(planeAt(0.58).hold).not.toBeNull()
    expect(planeAt(0.5).hold).toBeNull()
    expect(planeAt(0.66).hold).toBeNull()
    const end = planeAt(0.6399).at
    const fix5 = flightPointAt(FLIGHT_HOLD_FRACTION)
    expect(close(end.x, fix5.x, 1) && close(end.y, fix5.y, 1)).toBe(true)
  })

  it("la cámara sigue los tramos de §19.4", () => {
    const top = pilotCamera(0)
    expect([top.tilt, top.scale, top.center]).toEqual([0, 0.45, FLIGHT_CONTROL[0]])
    const behind = pilotCamera(0.3)
    expect(behind.tilt).toBeCloseTo(48)
    expect(behind.scale).toBeCloseTo(1)
    expect(behind.turn).toBeCloseTo(-6)
    expect(pilotCamera(0.6).scale).toBeCloseTo(0.8)
    const land = pilotCamera(0.9)
    expect(land.tilt).toBeCloseTo(30)
    expect(land.scale).toBeCloseTo(1.15)
    const out = pilotCamera(1)
    expect(out.scale).toBeCloseTo(0.55)
    expect(out.tilt).toBeCloseTo(22)
  })

  it("el avión va en el foco: la cámara lo sigue y su marca cae donde el plano lo pinta", () => {
    for (const p of [0.2, 0.4, 0.75]) {
      const fr = pilotFrame(p, RUN)
      expect(close(fr.marks.plane.x, 0, 1e-6) && close(fr.marks.plane.y, 0, 1e-6)).toBe(true)
      const fix = project(fr.cam, flightPointAt(FLIGHT_FIXES[0]))
      expect(fr.marks.fixes[0]).toEqual(fix)
    }
  })

  it("los fijos se encienden al pasar y la pantalla de ruta va un paso por delante", () => {
    const start = pilotFrame(0.05, RUN)
    expect(start.lit.every((l) => !l)).toBe(true)
    expect([start.step, start.next]).toEqual([0, 1])
    const end = pilotFrame(1, RUN)
    expect(end.lit.every(Boolean)).toBe(true)
    expect([end.step, end.next]).toEqual([5, null])
  })

  it("el estado usa el vocabulario de la UI: lista → en ejecución → espera → en ejecución → terminada", () => {
    const seq = [0.05, 0.3, 0.58, 0.7, 0.95].map((p) => pilotFrame(p, RUN).status)
    expect(seq).toEqual(["ready", "running", "waiting", "running", "done"])
    expect(PILOT_ANNUNCIATORS.map((s) => PILOT_STATUS[s])).toEqual(["En ejecución", "Espera tu aprobación", "Terminada"])
  })

  it("la cabina pasa de la bitácora al lote y del lote a los canales", () => {
    expect(pilotFrame(0.4, RUN).phase).toBe("log")
    expect(pilotFrame(0.6, RUN).phase).toBe("lot")
    const sent = pilotFrame(0.8, RUN)
    expect(sent.phase).toBe("sent")
    expect(sent.channels).toBe(PILOT_COPY.cockpit.channels.length)
  })

  it("el fotograma final (servidor y movimiento reducido) es el aterrizaje completo", () => {
    const fr = pilotFrame(1, RUN)
    expect([fr.done, fr.status, fr.airportLit, fr.results, fr.funnel, fr.tune]).toEqual([1, "done", true, 1, 1, 1])
    expect([fr.found, fr.qualified, fr.contacted]).toEqual([25, 9, 4])
    expect(fr.board.map((r) => [r.stage, r.flip])).toEqual([
      ["demo", 0],
      ["replied", 0],
      ["following", 0],
      ["following", 0],
      ["discarded", 0],
    ])
  })
})

describe("el tablero y los instrumentos", () => {
  it("cada fila voltea con rotateX de 90° a 0° y solo avanza", () => {
    expect(boardRow(0.05, PILOT_BOARD[0])).toEqual({ stage: null, flip: 0 })
    expect(boardRow(0.2, PILOT_BOARD[0]).flip).toBe(90)
    expect(boardRow(0.22, PILOT_BOARD[0]).flip).toBe(0)
    const order = Object.keys(PILOT_STAGES)
    PILOT_BOARD.forEach((t) => t.forEach(([at, s], i) => i && expect([at > t[i - 1][0], order.indexOf(s) > order.indexOf(t[i - 1][1])]).toEqual([true, true])))
  })

  it("los relojes van de −135° a 135° y el tope se mide en 20 segmentos", () => {
    expect(dial(0)).toEqual({ arc: 0, needle: -135 })
    expect(dial(25)).toEqual({ arc: 0.75, needle: 135 })
    expect(dial(99).needle).toBe(135)
    expect(capSegments(4, 40)).toBe(2)
    expect(capSegments(40, 40)).toBe(20)
    expect(capSegments(0, 40)).toBe(0)
  })
})

describe("el guion por nicho", () => {
  it("la escena está apagada hasta que el piloto esté en producción", () => {
    expect(FILM_FEATURES.pilot).toBe(false)
  })

  it.each(FILM_NICHES)("%s: las cifras cuadran y no hay porcentajes", (n) => {
    const c = PILOT_CONTENT[n]
    const { approved, skipped } = lotCounts(PILOT_LOT)
    expect(new Set(c.accounts).size).toBe(5)
    expect(PILOT_LOT).toHaveLength(c.accounts.length)
    expect(approved + skipped).toBe(c.accounts.length)
    // La ejecución del día: encontró ≥ calificó ≥ las cuentas del lote ≥ contactó, y el tope por encima.
    expect(PILOT_RUN.found).toBeGreaterThanOrEqual(PILOT_RUN.qualified)
    expect(PILOT_RUN.qualified).toBeGreaterThanOrEqual(c.accounts.length)
    expect(PILOT_RUN.cap).toBeGreaterThanOrEqual(approved)
    expect(PILOT_RUN.found).toBeLessThanOrEqual(25)
    // El embudo del mes: encontradas ≥ calificadas ≥ contactadas ≥ respondieron ≥ demos > 0.
    c.funnel.forEach((v, i) => i && expect(v).toBeLessThanOrEqual(c.funnel[i - 1]))
    expect(c.funnel[4]).toBeGreaterThan(0)
    const text = JSON.stringify(c)
    expect(text).not.toMatch(/%/)
  })

  // El lote y el tablero son los mismos en los cuatro nichos (cambian los nombres).
  it("la cuenta que se omite del lote es la que termina en «Descartado», y solo ella", () => {
    const final = pilotFrame(1, RUN).board
    PILOT_LOT.forEach((on, i) => expect(final[i].stage === "discarded").toBe(!on))
    expect(final[0].stage).toBe("demo")
  })

  it("N y M del lote salen de las casillas", () => {
    expect(lotCounts([true, true, true, true, false])).toEqual({ approved: 4, skipped: 1 })
    expect(PILOT_COPY.cockpit.approve(4)).toBe("Aprobar 4 y contactar")
    expect(PILOT_COPY.cockpit.skipped(1)).toBe("1 se omiten")
  })

  it("los límites honestos de §19.6: ni WhatsApp, ni Ley 2300, ni Apollo, ni créditos, ni porcentajes", () => {
    // Las frases con cifra son funciones: JSON.stringify no las ve, así que se pintan aquí.
    const c = PILOT_COPY.cockpit
    const rendered = [c.step(3, 6), c.approveOne("X"), c.approve(4), c.skipped(1), c.sent(4)]
    const all = JSON.stringify({ PILOT_COPY, PILOT_CONTENT, PILOT_RUN, PILOT_STAGES, PILOT_STATUS, rendered })
    expect(all).not.toMatch(/whatsapp|instagram|linkedin|2300|cumple|apollo|cr[ée]dito|garantiza|%/i)
    expect(PILOT_COPY.cockpit.channels).toEqual(["Correo", "Llamada del agente", "SMS"])
    expect(PILOT_COPY.zone.passed).toContain("Registro de Números Excluidos")
  })
})
