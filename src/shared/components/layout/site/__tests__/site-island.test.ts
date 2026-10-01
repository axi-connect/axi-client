/**
 * La isla del nav (plan §18.1): lo que dice en la home con `film:chapter` y
 * fuera de ella con el progreso de lectura. Y que el contenido del menú por
 * intención no lleve a ningún sitio inexistente.
 */
import { SITE_INTENTS, SITE_MENU_LINKS, SITE_MENU_SIDE } from "../site-nav.content"
import { islandOnFilm, islandOnPage, pageName, readProgress } from "../site-island"

describe("la isla en la home", () => {
  it("antes del primer capítulo dice qué es; luego el capítulo y «Capítulo n de 4»", () => {
    expect(islandOnFilm(null)).toEqual({ title: "Axi Connect", sub: "La película · 4 capítulos", ring: 0 })
    expect(islandOnFilm({ chapter: null, index: -1, total: 4, progress: 0.02 }).title).toBe("Axi Connect")
    expect(islandOnFilm({ chapter: "Cobrar", index: 2, total: 4, progress: 0.5 })).toEqual({ title: "Cobrar", sub: "Capítulo 3 de 4", ring: 0.5 })
  })

  it("el anillo nunca sale de 0–1", () => {
    expect(islandOnFilm({ chapter: "Crecer", index: 3, total: 4, progress: 1.4 }).ring).toBe(1)
  })
})

describe("la isla fuera de la home", () => {
  it("nombra la sección de primer nivel y cuenta lo leído", () => {
    expect(pageName("/precios")).toBe("Precios")
    expect(pageName("/legal/terminos")).toBe("Legal")
    expect(pageName("/ruta-sin-nombre")).toBe("Axi Connect")
    expect(islandOnPage("/casos", 0.426)).toEqual({ title: "Casos", sub: "43 % leído", ring: 0.426 })
  })

  it("el progreso de lectura va de 0 a 1 y una página que no hace scroll está leída", () => {
    expect(readProgress(0, 3000, 900)).toBe(0)
    expect(readProgress(2100, 3000, 900)).toBe(1)
    expect(readProgress(1050, 3000, 900)).toBeCloseTo(0.5)
    expect(readProgress(0, 800, 900)).toBe(1)
  })
})

describe("el menú por intención", () => {
  it("tres intenciones, una por pilar y por cinta, en el orden del lienzo", () => {
    expect(SITE_INTENTS.map((i) => [i.name, i.pillar, i.tone])).toEqual([
      ["Vender y cobrar", "Prosperidad", "coral"],
      ["Crecer", "Crecimiento", "amber"],
      ["Atender", "Libertad", "violet"],
    ])
  })

  it("todos los enlaces son rutas públicas reales (sin el /#medicion del lienzo)", () => {
    const hrefs = [
      ...SITE_INTENTS.flatMap((i) => i.cards.map((c) => c.href)),
      ...SITE_MENU_SIDE.flatMap((s) => s.rows.map((r) => r.href)),
      SITE_MENU_LINKS.pricing.href,
      ...SITE_MENU_LINKS.more.map((l) => l.href),
    ]
    const ROUTES = ["/", "/productos", "/soluciones", "/integraciones", "/precios", "/casos"]
    for (const h of hrefs) expect(ROUTES).toContain(h.split("#")[0] || "/")
    expect(hrefs).not.toContain("/#medicion")
    expect(hrefs).toContain("/#medir")
  })
})
