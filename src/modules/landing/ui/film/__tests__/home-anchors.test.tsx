/**
 * Ningún enlace «/#x» del sitio apunta a un ancla que la home no tiene.
 *
 * La home es la película: sus anclas son los `id` de `FilmPage` renderizado.
 * Se revisan la cabecera (SITE_INTENTS, SITE_MENU_SIDE, SITE_MENU_LINKS), el pie (SITE_FOOTER_COLUMNS), las
 * capacidades de /productos y, por si alguien escribe el enlace a mano en una
 * página, todo «"/#x"» literal del código. Un ancla rota aterriza arriba de la
 * home sin aviso (pasó con /#medicion y /#como-funciona, 2026-09-30).
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { render } from "@testing-library/react"

jest.mock("../engine/film-engine", () => ({ startFilm: jest.fn(() => ({ stop: jest.fn(), scrollTo: jest.fn(), setNiche: jest.fn() })) }))
jest.mock("@/core/analytics/track", () => ({ track: jest.fn() }))

import { FIXTURE_CATALOG } from "@/modules/landing/domain/testing/catalog.fixture"
import { CAPABILITIES } from "@/modules/landing/ui/content/productos.content"
import { SITE_FOOTER_COLUMNS, SITE_INTENTS, SITE_MENU_LINKS, SITE_MENU_SIDE } from "@/shared/components/layout/site/site-nav.content"
import { FilmPage } from "../FilmPage"

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = jest.fn()
  window.IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof IntersectionObserver
  window.ResizeObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof ResizeObserver
})

/** Todo `href` dentro de un objeto de contenido, a cualquier profundidad. */
function hrefs(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) hrefs(v, out)
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "href" && typeof v === "string") out.push(v)
      else hrefs(v, out)
    }
  }
  return out
}

/** Los «"/#x"» escritos en el código de src (sin tests). */
function literalHomeAnchors(dir: string, out: { file: string; anchor: string }[] = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name === "__tests__" || name === "node_modules") continue
    if (statSync(path).isDirectory()) literalHomeAnchors(path, out)
    else if (/\.(ts|tsx)$/.test(name)) {
      for (const m of readFileSync(path, "utf8").matchAll(/["'`]\/#([A-Za-z][\w-]*)["'`]/g)) out.push({ file: path, anchor: m[1] })
    }
  }
  return out
}

const homeAnchor = (href: string) => href.match(/^\/#([\w-]+)$/)?.[1] ?? null

test("los enlaces a la home apuntan a anclas que existen en la película", () => {
  const { container } = render(<FilmPage catalog={FIXTURE_CATALOG} />)
  const ids = new Set(Array.from(container.querySelectorAll("[id]")).map((el) => el.id))

  const fromContent = [...hrefs([SITE_INTENTS, SITE_MENU_SIDE, SITE_MENU_LINKS]), ...hrefs(SITE_FOOTER_COLUMNS), ...hrefs(CAPABILITIES)]
    .map(homeAnchor)
    .filter((a): a is string => a !== null)
  const fromCode = literalHomeAnchors(join(process.cwd(), "src"))

  // La prueba debe ver enlaces: si un refactor deja la lista vacía, no pasa en falso.
  expect(fromContent.length).toBeGreaterThan(0)
  expect(fromCode.length).toBeGreaterThan(0)

  const broken = [
    ...fromContent.filter((a) => !ids.has(a)).map((a) => `contenido → /#${a}`),
    ...fromCode.filter(({ anchor }) => !ids.has(anchor)).map(({ file, anchor }) => `${file.replace(process.cwd() + "/", "")} → /#${anchor}`),
  ]
  expect(broken).toEqual([])
})
