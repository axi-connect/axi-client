/**
 * La pista del nicho de la película: se traduce al código del onboarding y
 * nunca inventa uno. Se prueban los dos signos: un nicho válido llega como
 * pista, uno desconocido (o ninguno) no deja nada.
 */
import { readFilmNicheHint, rememberFilmNicheFromUrl } from "../film-niche-hint"

beforeEach(() => window.localStorage.clear())

it("sin nada guardado no hay pista", () => {
  expect(readFilmNicheHint()).toBeNull()
})

it("el nicho elegido en la home se traduce al del onboarding", () => {
  window.localStorage.setItem("axi.film.nicho", "beauty")
  expect(readFilmNicheHint()).toBe("health_beauty")
})

it("?nicho= de una campaña se recuerda y llega como pista", () => {
  rememberFilmNicheFromUrl("?plan=free_trial&nicho=Restaurantes")
  expect(readFilmNicheHint()).toBe("restaurants")
})

it("un nicho desconocido en la URL no pisa el que ya había", () => {
  window.localStorage.setItem("axi.film.nicho", "tech")
  rememberFilmNicheFromUrl("?nicho=moda")
  expect(readFilmNicheHint()).toBe("retail_fashion")
})
