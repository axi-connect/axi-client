/**
 * El dominio de la película: nichos, cifras del mapa y coherencia del guion.
 * Las cifras son de ejemplo, pero no pueden contradecirse: la voz del progreso
 * (DESIGN.md §7.1) exige que cada número cuadre con los demás.
 */
import { FILM_CONTENT } from "../film-content"
import { DEFAULT_FILM_NICHE, FILM_NICHES, parseFilmNiche } from "../niches"
import { formatMillions, formatPercent, formatPesos, routeScenario } from "../route-scenario"

const digits = (s: string) => Number(s.replace(/[^\d]/g, ""))

describe("parseFilmNiche", () => {
  it("acepta los códigos, los alias de campaña y los del onboarding", () => {
    expect(parseFilmNiche("tech")).toBe("tech")
    expect(parseFilmNiche(" Restaurantes ")).toBe("restaurants")
    expect(parseFilmNiche("health_beauty")).toBe("beauty")
    expect(parseFilmNiche("b2b_distribution")).toBe("b2b")
  })

  it("lo desconocido o vacío no personaliza", () => {
    expect(parseFilmNiche("moda")).toBeNull()
    expect(parseFilmNiche("")).toBeNull()
    expect(parseFilmNiche(null)).toBeNull()
  })

  it("el negocio de ejemplo es uno de los nichos", () => {
    expect(FILM_NICHES).toContain(DEFAULT_FILM_NICHE)
  })
})

describe("routeScenario", () => {
  it("reproduce las cifras del storyboard aprobado (Tecnología)", () => {
    const s = routeScenario({ goal: 30_000_000, ticket: 925_000, businessDaysLeft: 6, unitPlural: "ventas" })
    expect(formatMillions(s.reached)).toBe("$ 18,9 M")
    expect(formatMillions(s.remaining)).toBe("$ 11,1 M")
    expect(formatMillions(s.behind)).toBe("$ 2,6 M")
    expect(formatMillions(s.goal * s.projected)).toBe("$ 24,6 M")
    expect(s.perDay).toBe(2)
    expect(formatPercent(s.done)).toBe("63 %")
  })

  it("redondea las ventas al día hacia arriba: quedarse corto no llega", () => {
    const s = routeScenario({ goal: 18_000_000, ticket: 160_000, businessDaysLeft: 6, unitPlural: "citas" })
    expect(s.perDay).toBe(7) // 6,94 → 7, nunca 6
  })

  it("formatea pesos completos y cifras menores al millón", () => {
    expect(formatPesos(30_000_000)).toBe("$ 30.000.000")
    expect(formatMillions(925_000)).toBe("$ 925.000")
    expect(formatMillions(120_000_000)).toBe("$ 120 M")
  })
})

describe("el guion por nicho", () => {
  it.each(FILM_NICHES)("%s: la primera indicación de hoy coincide con el ritmo calculado", (niche) => {
    const c = FILM_CONTENT[niche]
    const s = routeScenario(c.route)
    expect(c.route.steps[0]).toContain(String(s.perDay))
    const rhythm = c.axel.proposals.find((p) => p.type === "Ritmo de la meta")
    expect(rhythm?.title).toContain(String(s.perDay))
  })

  it.each(FILM_NICHES)("%s: los abonos más el saldo suman el total", (niche) => {
    const k = FILM_CONTENT[niche].collect
    const paid = k.parts.reduce((n, [, amount]) => n + digits(amount), 0)
    expect(paid + digits(k.remaining)).toBe(digits(k.total))
  })

  it.each(FILM_NICHES)("%s: el producto reconocido existe en el catálogo", (niche) => {
    const p = FILM_CONTENT[niche].photo
    expect(p.catalog[p.matchIndex]).toBeDefined()
  })

  it("ningún nicho promete productos con tallas o colores", () => {
    const text = JSON.stringify(FILM_CONTENT).toLowerCase()
    expect(text).not.toMatch(/\btalla|\bcolor(es)?\b/)
  })
})
