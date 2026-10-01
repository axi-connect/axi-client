/**
 * La isla cliente de la película: el nicho decide qué variante se ve y viaja
 * en el CTA. El motor de animación no se carga con movimiento reducido.
 */
import { fireEvent, render, screen } from "@testing-library/react"

const track = jest.fn()
jest.mock("@/core/analytics/track", () => ({ track: (...a: unknown[]) => track(...a) }))
const startFilm = jest.fn(() => ({ stop: jest.fn(), scrollTo: jest.fn() }))
jest.mock("../engine/film-engine", () => ({ startFilm: (...a: unknown[]) => startFilm(...(a as [])) }))

import { FilmRoot } from "../FilmRoot"
import { FilmCta } from "../parts/FilmCta"
import { NicheChoice } from "../parts/NicheChoice"

function setReducedMotion(reduce: boolean) {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes("reduce"),
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
}

function Film() {
  return (
    <FilmRoot>
      <NicheChoice niche="beauty">Belleza</NicheChoice>
      <FilmCta>Prueba gratis</FilmCta>
    </FilmRoot>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  track.mockClear()
  startFilm.mockClear()
  window.history.replaceState(null, "", "/")
  setReducedMotion(true)
  Element.prototype.scrollIntoView = jest.fn()
})

it("sin elección muestra el negocio de ejemplo y el CTA lo lleva", () => {
  const { container } = render(<Film />)
  expect(container.querySelector("[data-film]")).toHaveAttribute("data-niche", "tech")
  expect(screen.getByRole("link", { name: "Prueba gratis" })).toHaveAttribute("href", "/comenzar?plan=free_trial&nicho=tech")
})

it("elegir un nicho reescribe la película, lo recuerda y lo mide", () => {
  const { container } = render(<Film />)
  fireEvent.click(screen.getByRole("button", { name: /Belleza/ }))
  expect(container.querySelector("[data-film]")).toHaveAttribute("data-niche", "beauty")
  expect(screen.getByRole("button", { name: /Belleza/ })).toHaveAttribute("aria-pressed", "true")
  expect(screen.getByRole("link", { name: "Prueba gratis" })).toHaveAttribute("href", "/comenzar?plan=free_trial&nicho=beauty")
  expect(window.localStorage.getItem("axi.film.nicho")).toBe("beauty")
  expect(track).toHaveBeenCalledWith({ name: "film_niche_chosen", params: { niche: "beauty", source: "choice" } })
})

it("?nicho= de la URL gana y se registra como campaña", () => {
  window.history.replaceState(null, "", "/?nicho=restaurantes")
  const { container } = render(<Film />)
  expect(container.querySelector("[data-film]")).toHaveAttribute("data-niche", "restaurants")
  expect(track).toHaveBeenCalledWith({ name: "film_niche_chosen", params: { niche: "restaurants", source: "url" } })
})

it("con movimiento reducido el motor no se carga", async () => {
  render(<Film />)
  await new Promise((r) => setTimeout(r, 600))
  expect(startFilm).not.toHaveBeenCalled()
})

it("sin movimiento reducido el motor arranca en diferido", async () => {
  setReducedMotion(false)
  render(<Film />)
  await new Promise((r) => setTimeout(r, 700))
  expect(startFilm).toHaveBeenCalledTimes(1)
})

it("emite «film:chapter» para la isla de la cabecera, y solo cuando cambia", () => {
  window.IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof IntersectionObserver
  window.ResizeObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof ResizeObserver
  const seen: unknown[] = []
  const listen = (e: Event) => seen.push((e as CustomEvent).detail)
  window.addEventListener("film:chapter", listen)
  // La capa pública hace scroll en `[data-app-scroll]`: sin él, la isla no escucha nada.
  const scroller = document.createElement("div")
  scroller.setAttribute("data-app-scroll", "")
  document.body.appendChild(scroller)
  const { unmount } = render(<Film />, { container: scroller })
  expect(seen[0]).toEqual({ chapter: null, index: -1, total: 4, progress: 0 })
  // Sin scroll, nada nuevo que contar.
  fireEvent.scroll(scroller)
  expect(seen).toHaveLength(1)
  unmount()
  window.removeEventListener("film:chapter", listen)
  scroller.remove()
})
