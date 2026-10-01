/**
 * Movimiento reducido = fotograma final (§12). Con `prefers-reduced-motion` el
 * motor no se carga, así que lo que se ve es el HTML del servidor y el CSS. En
 * las escenas de la tanda 3 y la tanda 4 se comprueba que ese HTML ya está en
 * el final y que nada queda escondido salvo lo que el lienzo apaga al final
 * (lista cerrada, con su razón).
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { render } from "@testing-library/react"

const startFilm = jest.fn(() => ({ stop: jest.fn(), scrollTo: jest.fn(), setNiche: jest.fn() }))
jest.mock("../engine/film-engine", () => ({ startFilm: (...a: unknown[]) => startFilm(...(a as [])) }))
jest.mock("@/core/analytics/track", () => ({ track: jest.fn() }))

import { FIXTURE_CATALOG } from "@/modules/landing/domain/testing/catalog.fixture"
import { goalFrame } from "@/modules/landing/domain/film/goal-camera"
import { CALL_NOTES, CALL_STAGES } from "@/modules/landing/domain/film/call-audio"
import { VAULT_RECEIPTS } from "@/modules/landing/domain/film/tanda3-content"
import { FilmRoot } from "../FilmRoot"
import { FaqScene, PricingScene } from "../scenes/after"
import { CloseScene } from "../scenes/close"
import { GoalScene } from "../scenes/goal"
import { CallScene, PhotoScene, TeamScene, VaultScene } from "../scenes/sell-moments"

/** Lo único que el fotograma final deja apagado, por diseño de los lienzos. */
const OFF_BY_DESIGN = new Set([
  "goal-start", // «Salida · 1 oct» se despide en 0,4–0,5
  "goal-recalc", // la píldora de Axi se apaga en 0,92–0,97
  "goal-projection-line", // la proyección cede ante la ruta de Axi aprobada
  "goal-slow-chip", // «Ritmo bajo» se apaga al aprobar la ruta
  "goal-axi-glow", // el brillo violeta es de Axi proponiendo: aprobada, se apaga
])

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = jest.fn()
})

function renderFilm() {
  return render(
    <FilmRoot>
      <GoalScene />
      <PhotoScene />
      <CallScene />
      <VaultScene />
      <TeamScene />
      <PricingScene catalog={FIXTURE_CATALOG} />
      <FaqScene />
      <CloseScene />
    </FilmRoot>,
  )
}

const zero = (el: HTMLElement | SVGElement) => el.style.opacity !== "" && Number(el.style.opacity) === 0

it("con movimiento reducido no se carga el motor", () => {
  renderFilm()
  expect(startFilm).not.toHaveBeenCalled()
})

it("nada queda en opacidad 0 en el HTML, salvo lo que el lienzo apaga al final", () => {
  const { container } = renderFilm()
  const hidden = Array.from(container.querySelectorAll<HTMLElement>("[style]")).filter(zero)
  const offenders = hidden.filter((el) => !OFF_BY_DESIGN.has(el.dataset.anim ?? ""))
  expect(offenders.map((el) => el.outerHTML.slice(0, 120))).toEqual([])
})

it.each([
  ["film-tanda4.css", [
    ".film-goal[data-approved] .film-goal-when-propose",
    ".film-goal:not([data-approved]) .film-goal-when-approved",
    ".film-faq-item summary::-webkit-details-marker", // el marcador nativo; el más/menos es propio
    ".film-faq-item[open] .film-faq-sign::after", // abierta, el «más» pierde su barra y queda «menos»
  ]],
  ["film-sell.css", [".film-photo-tile[data-anim=\"photo-slot\"]", ".film-photo-scan", ".film-team-shell"]],
])("%s: las únicas reglas que esconden son las del final", (file, allowed) => {
  const css = readFileSync(join(__dirname, "..", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
  const rules = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
  const hiding = rules
    .filter(([, , body]) => /(^|;)\s*opacity:\s*0\s*(;|$)|display:\s*none/.test(body))
    .flatMap(([, sel]) => sel.split(",").map((s) => s.trim()))
    // Lo que solo se oculta en móvil es composición, no un estado de animación.
    .filter((sel) => !/^(\.film-photo-shelf|\.film-photo-sheet-top|\.film-photo-caption|\.film-call-aura|\.film-team-inbox|\.film-team-keys|\.film-team-pad|\.film-team-modes svg|\.film-goal-(then|bar-legend|rule|routes|route-now|note))$/.test(sel))
  for (const sel of hiding) expect(allowed).toContain(sel)
})

it("la meta termina con la ruta de Axi aprobada", () => {
  const { container } = renderFilm()
  const goal = container.querySelector<HTMLElement>("[data-scene=goal]")!
  expect(goal).toHaveAttribute("data-approved")
  const plane = goal.querySelector<HTMLElement>("[data-anim=goal-plane]")!
  expect(plane.style.transform).toBe(goalFrame(1).plane)
})

it("la llamada sin reproducir: etapas y notas completas, la esfera lista y el audio sin descargar", () => {
  const { container } = renderFilm()
  const call = container.querySelector<HTMLElement>("[data-scene=call]")!
  const stages = call.querySelectorAll(".film-call-stages [data-on]")
  expect(stages).toHaveLength(CALL_STAGES.length)
  expect(call.querySelectorAll(".film-call-note[data-on]")).toHaveLength(CALL_NOTES.length)
  expect(call.querySelector("button.film-call-pearl")).toHaveAccessibleName("Escuchar la llamada")
  call.querySelectorAll("audio").forEach((a) => expect(a).toHaveAttribute("preload", "none"))
  expect(call).not.toHaveAttribute("data-playing")
})

it("la meta y el piloto: titular y panel llegan a pleno al pin y entran con el reveal de antes", () => {
  // Signo 1: en el fotograma final no hay titular ni panel apagados (antes entraban dentro del pin, desde 0).
  for (let p = 0; p <= 1.0001; p += 0.05) {
    expect(goalFrame(p).head).toBe(1)
    expect(goalFrame(p).panel).toBe(1)
  }
  // Signo 2: siguen teniendo entrada (no aparecen de golpe): son data-anim="head", el reveal de sceneTimeline.
  const { container } = render(<GoalScene />)
  const goal = container.querySelector<HTMLElement>("[data-scene=goal]")!
  const head = goal.querySelector<HTMLElement>(".film-goal-head")!
  expect(head).toHaveAttribute("data-anim", "head")
  expect(head.style.opacity).toBe("")
  const panels = goal.querySelectorAll<HTMLElement>(".film-goal-panel")
  expect(panels.length).toBeGreaterThan(0)
  panels.forEach((el) => {
    expect(el).toHaveAttribute("data-anim", "head")
    expect(el.style.opacity).toBe("")
  })
})

it("la bóveda imprime el cupón de cada nicho", () => {
  const { container } = renderFilm()
  const vault = container.querySelector<HTMLElement>("[data-scene=vault]")!
  for (const receipt of Object.values(VAULT_RECEIPTS)) expect(vault.textContent).toContain(receipt.total)
})

it("el equipo termina con la conversación devuelta a Axi y la respuesta entera", () => {
  const { container } = renderFilm()
  const team = container.querySelector<HTMLElement>("[data-scene=team]")!
  expect(team).toHaveAttribute("data-mode", "0")
  expect(team).toHaveAttribute("data-returned")
  team.querySelectorAll<HTMLElement>("[data-anim=team-reply-text]").forEach((t) => expect(t.textContent).toBe(t.dataset.full))
})

it("precios pinta las tres tarjetas y Enterprise; preguntas abre la primera", () => {
  const { container } = renderFilm()
  expect(container.querySelectorAll("[data-anim=price-card]")).toHaveLength(3)
  expect(container.querySelector("[data-testid=plan-enterprise]")).not.toBeNull()
  const details = container.querySelectorAll("[data-scene=faq] details")
  expect(details[0]).toHaveAttribute("open")
  expect(details[1]).not.toHaveAttribute("open")
})

it("el cierre: el isotipo lleno y los CTA a la vista", () => {
  const { container } = renderFilm()
  const close = container.querySelector<HTMLElement>("[data-scene=close]")!
  expect(close.querySelectorAll("[data-ribbon]")).toHaveLength(3)
  expect(close.querySelector("a[href^='/comenzar']")).not.toBeNull()
})
