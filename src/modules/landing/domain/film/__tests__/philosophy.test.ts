/**
 * «Vendemos progreso»: la pista se detiene en cada pilar (meseta de lectura) y
 * nunca retrocede; el último pilar queda centrado en cualquier ancho.
 */
import { PHILOSOPHY, PHILOSOPHY_PLATEAU, PHILOSOPHY_TRACK, PHILOSOPHY_TRACK_FROM, philosophyMove, philosophyTravel } from "../philosophy-content"

const vw = 1440
const travel = philosophyTravel(vw)
const stops = [0, 1, 2].map((i) => travel - (2 - i) * PHILOSOPHY_TRACK.pillar)

describe("philosophyTravel", () => {
  it("deja el último pilar centrado", () => {
    const lastLeft = vw + 2 * PHILOSOPHY_TRACK.pillar - travel
    expect(lastLeft).toBe((vw - PHILOSOPHY_TRACK.pillar) / 2)
  })
})

describe("philosophyMove", () => {
  it("quieta antes de la pista y al final en el último pilar", () => {
    expect(philosophyMove(0, stops)).toBe(0)
    expect(philosophyMove(PHILOSOPHY_TRACK_FROM, stops)).toBe(0)
    expect(philosophyMove(1, stops)).toBeCloseTo(travel)
  })

  it("una meseta por pilar, con el pilar centrado", () => {
    const span = (1 - PHILOSOPHY_TRACK_FROM - 3 * PHILOSOPHY_PLATEAU) / 3
    stops.forEach((stop, i) => {
      const start = PHILOSOPHY_TRACK_FROM + (i + 1) * span + i * PHILOSOPHY_PLATEAU
      expect(philosophyMove(start + 0.001, stops)).toBeCloseTo(stop)
      expect(philosophyMove(start + PHILOSOPHY_PLATEAU - 0.001, stops)).toBeCloseTo(stop)
    })
  })

  it("nunca retrocede", () => {
    let last = -1
    for (let p = 0; p <= 1; p += 0.002) {
      const m = philosophyMove(p, stops)
      expect(m).toBeGreaterThanOrEqual(last - 1e-9)
      last = m
    }
  })

  it("tres pilares con su texto", () => {
    expect(PHILOSOPHY.pillars).toHaveLength(3)
    // Libertad, tal cual el lienzo: las llamadas entrantes se atienden (en producción desde el 2026-10-01).
    expect(PHILOSOPHY.pillars[2].body).toBe(
      "WhatsApp, Instagram, llamadas y agenda se atienden de día y de noche. Tu equipo entra cuando hace falta criterio, no para responder lo mismo cien veces.",
    )
  })
})
