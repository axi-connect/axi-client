/**
 * La home como documento: un solo h1, una h2 por escena, cada `aria-labelledby`
 * apunta a un id que existe y ningún id se repite (el HTML trae las cuatro
 * variantes de nicho, así que un id dentro de `ByNiche` se repetiría cuatro
 * veces). Y nada que reciba foco vive dentro de algo `aria-hidden`.
 */
import { render } from "@testing-library/react"

jest.mock("../engine/film-engine", () => ({ startFilm: jest.fn() }))
jest.mock("@/core/analytics/track", () => ({ track: jest.fn() }))
// La escena del piloto carga su fuente con next/font (solo existe en el build de Next).
jest.mock("next/font/google", () => ({ IBM_Plex_Mono: () => ({ className: "", variable: "", style: {} }) }))

import { FIXTURE_CATALOG } from "@/modules/landing/domain/testing/catalog.fixture"
import { FilmPage } from "../FilmPage"

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = jest.fn()
})

const FOCUSABLE = "a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex='-1'])"

function page() {
  return render(<FilmPage catalog={FIXTURE_CATALOG} />).container
}

it("un solo h1", () => {
  expect(page().querySelectorAll("h1")).toHaveLength(1)
})

it("ningún id se repite", () => {
  const ids = Array.from(page().querySelectorAll("[id]")).map((el) => el.id)
  const repeated = ids.filter((id, i) => ids.indexOf(id) !== i)
  expect([...new Set(repeated)]).toEqual([])
})

it("cada aria-labelledby apunta a un id que existe", () => {
  const root = page()
  const orphans = Array.from(root.querySelectorAll("[aria-labelledby]")).flatMap((el) =>
    (el.getAttribute("aria-labelledby") ?? "")
      .split(/\s+/)
      .filter((id) => id && !root.querySelector(`#${CSS.escape(id)}`))
      .map((id) => `${el.tagName.toLowerCase()}[data-scene=${(el as HTMLElement).dataset.scene ?? "?"}] → #${id}`),
  )
  expect(orphans).toEqual([])
})

it("cada escena se nombra con una h2", () => {
  const root = page()
  const unnamed = Array.from(root.querySelectorAll<HTMLElement>("section[data-scene]"))
    .filter((s) => s.dataset.scene !== "hero")
    .filter((s) => {
      const id = s.getAttribute("aria-labelledby")
      const label = id ? root.querySelector(`#${CSS.escape(id)}`) : null
      return label?.tagName !== "H2"
    })
    .map((s) => s.dataset.scene)
  expect(unnamed).toEqual([])
})

it("nada que recibe foco vive dentro de algo aria-hidden", () => {
  const trapped = Array.from(page().querySelectorAll<HTMLElement>("[aria-hidden='true'] " + FOCUSABLE.split(", ").join(", [aria-hidden='true'] ")))
  expect(trapped.map((el) => el.outerHTML.slice(0, 100))).toEqual([])
})
