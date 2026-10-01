/**
 * El riel temario (lienzo v2 aprobado): el índice apunta a anclas reales, en
 * el orden de la película, y la matemática del tambor y del recorrido.
 */
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { DRUM, RAIL_INDEX, clampIndex, currentIndex, drumPose, travelEase, travelSeconds, wheelStep } from "../rail-index"

const SCENES_DIR = join(__dirname, "../../../ui/film/scenes")
const sceneIds = () => {
  // Cada `<section id="…" … data-scene="…">` de las escenas (o el orden inverso de atributos).
  const ids = new Map<string, string>()
  for (const f of readdirSync(SCENES_DIR)) {
    const src = readFileSync(join(SCENES_DIR, f), "utf8")
    for (const m of src.matchAll(/<section[^>]*>/g)) {
      const tag = m[0]
      const scene = tag.match(/data-scene="([a-z]+)"/)?.[1]
      const id = tag.match(/\bid="([^"]+)"/)?.[1]
      if (scene && id) ids.set(scene, id)
    }
  }
  return ids
}

describe("el índice del riel", () => {
  it("cada entrada apunta al id real de su escena", () => {
    const ids = sceneIds()
    // precios y preguntas toman el id de LANDING_ANCHORS: «planes» y «preguntas».
    ids.set("pricing", "planes")
    ids.set("faq", "preguntas")
    for (const e of RAIL_INDEX) expect([e.scene, ids.get(e.scene)]).toEqual([e.scene, e.id])
  })

  it("sigue el orden de la película (FilmPage) y no repite escenas", () => {
    const page = readFileSync(join(__dirname, "../../../ui/film/FilmPage.tsx"), "utf8")
    const order = ["HeroScene", "PhilosophyScene", "NicheScene", "RadarScene", "PilotScene", "FollowupScene", "ChatScene", "PhotoScene", "CallScene", "VaultScene", "TeamScene", "CollectScene", "PipelineScene", "GoalScene", "AxelScene", "MeasureScene", "PricingScene", "FaqScene", "CloseScene"]
    const positions = order.map((c) => page.indexOf(`<${c}`))
    expect(positions.every((p) => p > 0)).toBe(true)
    for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(positions[i - 1])
    expect(new Set(RAIL_INDEX.map((e) => e.id)).size).toBe(RAIL_INDEX.length)
  })
})

describe("el tambor", () => {
  it("la del centro va a tamaño y nítida; con la distancia se achica y se apaga", () => {
    expect(drumPose(0)).toEqual({ y: 0, scale: 1, opacity: 1, hidden: false })
    const one = drumPose(1)
    // La del centro es más alta: las vecinas se apartan `bump` además de su fila.
    expect(one.y).toBe(DRUM.row + DRUM.bump)
    expect(one.scale).toBeCloseTo(0.88)
    expect(one.opacity).toBeCloseTo(0.7)
    expect(drumPose(-2).y).toBe(-2 * DRUM.row - DRUM.bump)
    expect(drumPose(2).y - drumPose(1).y).toBe(DRUM.row)
    // Cinco a la vista (−2…2); más allá, oculta.
    expect(drumPose(2).hidden).toBe(false)
    expect(drumPose(3.5).hidden).toBe(true)
  })

  it("la rueda avanza a pasos de 60 px y guarda lo que sobra (los dos sentidos)", () => {
    expect(wheelStep(0, 30)).toEqual({ steps: 0, acc: 30 })
    expect(wheelStep(30, 40)).toEqual({ steps: 1, acc: 10 })
    expect(wheelStep(0, 130)).toEqual({ steps: 2, acc: 10 })
    expect(wheelStep(0, -70)).toEqual({ steps: -1, acc: -10 })
    expect(clampIndex(-3, 19)).toBe(0)
    expect(clampIndex(40, 19)).toBe(18)
  })
})

describe("el recorrido", () => {
  it("dura según la distancia, entre 1,2 y 2,5 s", () => {
    expect(travelSeconds(900, 900)).toBeCloseTo(1.265)
    expect(travelSeconds(-900, 900)).toBeCloseTo(1.265)
    expect(travelSeconds(0, 900)).toBe(1.2)
    expect(travelSeconds(900 * 40, 900)).toBe(2.5)
    expect(travelSeconds(900 * 10, 900)).toBeGreaterThan(travelSeconds(900 * 2, 900))
  })

  it("el easing entra y sale suave, de 0 a 1", () => {
    expect(travelEase(0)).toBe(0)
    expect(travelEase(1)).toBe(1)
    expect(travelEase(0.5)).toBeCloseTo(0.5)
    expect(travelEase(0.1)).toBeLessThan(0.01)
  })

  it("la escena actual es la última que cruzó la mitad de la ventana", () => {
    const tops = [0, 900, 3000, 5000]
    expect(currentIndex(tops, 0, 900)).toBe(0)
    expect(currentIndex(tops, 500, 900)).toBe(1)
    expect(currentIndex(tops, 2600, 900)).toBe(2)
    expect(currentIndex(tops, 9000, 900)).toBe(3)
  })
})
