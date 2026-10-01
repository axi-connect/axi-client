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

it("sin movimiento reducido el motor no se evalúa en la carga: arranca con la primera intención", async () => {
  setReducedMotion(false)
  // La carga ya terminó y no hay reposo a la vista: solo la intención lo arranca.
  window.requestIdleCallback = jest.fn(() => 1) as unknown as typeof window.requestIdleCallback
  window.cancelIdleCallback = jest.fn()
  render(<Film />)
  await new Promise((r) => setTimeout(r, 300))
  // Signo 1: sin que el visitante haga nada, el motor no arrancó.
  expect(startFilm).not.toHaveBeenCalled()
  // Signo 2: con la primera intención (un toque, una rueda…) arranca, y una sola vez.
  fireEvent.pointerDown(window)
  fireEvent.wheel(window)
  await new Promise((r) => setTimeout(r, 50))
  expect(startFilm).toHaveBeenCalledTimes(1)
})

it("si la página llega con un ancla, el motor arranca en el acto (M1: realinea al terminar)", async () => {
  setReducedMotion(false)
  window.requestIdleCallback = jest.fn(() => 1) as unknown as typeof window.requestIdleCallback
  window.history.replaceState(null, "", "/#medir")
  render(<Film />)
  await new Promise((r) => setTimeout(r, 50))
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

it("la píldora se aparta en cualquier ancho solo con data-pill-avoid=\"always\"; el resto, solo en móvil", () => {
  // El observador de la franja de abajo: se captura su callback para simular lo que entra en ella.
  const observers: { cb: IntersectionObserverCallback; opts?: IntersectionObserverInit }[] = []
  window.IntersectionObserver = jest.fn((cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) => {
    observers.push({ cb, opts })
    return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() }
  }) as unknown as typeof IntersectionObserver
  window.ResizeObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof ResizeObserver
  const scroller = document.createElement("div")
  scroller.setAttribute("data-app-scroll", "")
  document.body.appendChild(scroller)
  const { container, unmount } = render(<Film />, { container: scroller })
  const pill = container.querySelector<HTMLElement>(".film-pill")!
  const band = observers.find((o) => o.opts?.rootMargin === "-88% 0px 0px 0px")!
  const plain = document.createElement("div")
  plain.dataset.pillAvoid = ""
  const always = document.createElement("div")
  always.dataset.pillAvoid = "always"
  const enter = (target: Element, isIntersecting: boolean) =>
    band.cb([{ target, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)

  // Signo 1: la cabina del piloto (data-pill-avoid a secas) la aparta en móvil (data-hide), no en escritorio.
  enter(plain, true)
  expect(pill).toHaveAttribute("data-hide", "true")
  expect(pill.getAttribute("data-avoid")).not.toBe("true")
  // Signo 2: la onda de la llamada (always) la aparta también en escritorio, y al salir vuelve.
  enter(always, true)
  expect(pill).toHaveAttribute("data-avoid", "true")
  enter(always, false)
  expect(pill).toHaveAttribute("data-avoid", "false")
  unmount()
  scroller.remove()
})
