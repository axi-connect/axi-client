/**
 * Ningún enlace «/productos#x» del sitio cae en el vacío (plan
 * productos_juego_plan.md §5 y §7).
 *
 * Un ancla vale si la página renderizada tiene ese `id` o si el router de hash
 * la resuelve (pestaña de «Pieza por pieza» o alias) hacia una escena que
 * existe. Se revisan la cabecera, el pie, el contenido de la página y todo
 * «"/productos#x"» literal del código.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react";

import * as CONTENT from "@/modules/landing/ui/content/productos.content";
import { PIECES } from "@/modules/landing/ui/content/productos.content";
import { SITE_FOOTER_COLUMNS, SITE_INTENTS, SITE_MENU_LINKS, SITE_MENU_SIDE } from "@/shared/components/layout/site/site-nav.content";
import ProductosPage from "@/app/(public)/productos/page";
import { resolveHash } from "../ProductosHashRouter";

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- doble de prueba de next/image
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}));
// moduleNameMapper resuelve primero el alias @/ y la hoja de estilos llegaría cruda.
jest.mock("@/modules/landing/ui/sections/productos/productos.css", () => ({}));
jest.mock("@/core/config/env", () => ({ ...jest.requireActual("@/core/config/env"), salesWhatsAppUrl: () => "https://wa.me/570000000000" }));

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
  window.IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof IntersectionObserver;
});

/** Todo `href` (o texto con forma de enlace) dentro de un objeto, a cualquier profundidad. */
function links(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => links(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => links(v, out));
  return out;
}

/** Los «"/productos#x"» escritos en el código de src (sin tests). */
function literalAnchors(dir: string, out: { file: string; anchor: string }[] = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "__tests__" || name === "node_modules") continue;
    if (statSync(path).isDirectory()) literalAnchors(path, out);
    else if (/\.(ts|tsx)$/.test(name)) {
      for (const m of readFileSync(path, "utf8").matchAll(/["'`]\/productos#([A-Za-z][\w-]*)["'`]/g)) out.push({ file: path, anchor: m[1] });
    }
  }
  return out;
}

const productosAnchor = (href: string) => href.match(/^\/productos#([\w-]+)$/)?.[1] ?? null;

test("los enlaces a /productos#x caen en una escena o pieza que existe", () => {
  const { container } = render(<ProductosPage />);
  const ids = new Set(Array.from(container.querySelectorAll("[id]")).map((el) => el.id));
  const lands = (anchor: string) => {
    if (!ids.has(anchor) && !resolveHash(`#${anchor}`)) return false;
    const target = resolveHash(`#${anchor}`);
    return target ? ids.has(target.scene) : true;
  };

  const fromNav = links([SITE_INTENTS, SITE_MENU_SIDE, SITE_MENU_LINKS, SITE_FOOTER_COLUMNS]).map(productosAnchor).filter((a): a is string => a !== null);
  const fromContent = links(CONTENT).map(productosAnchor).filter((a): a is string => a !== null);
  const fromCode = literalAnchors(join(process.cwd(), "src"));

  // Debe haber enlaces que revisar: si un refactor vacía la lista, no pasa en falso.
  expect(fromNav.length).toBeGreaterThanOrEqual(6);

  const broken = [
    ...[...fromNav, ...fromContent].filter((a) => !lands(a)).map((a) => `contenido → /productos#${a}`),
    ...fromCode.filter(({ anchor }) => !lands(anchor)).map(({ file, anchor }) => `${file.replace(process.cwd() + "/", "")} → /productos#${anchor}`),
  ];
  expect(broken).toEqual([]);
});

test("cada pieza tiene su sección con id dentro de #piezas y el router la abre", () => {
  const { container } = render(<ProductosPage />);
  const pieces = container.querySelector("#piezas");
  expect(pieces).not.toBeNull();
  for (const piece of PIECES) {
    expect(pieces?.querySelector(`#${piece.id}`)).not.toBeNull();
    expect(resolveHash(`#${piece.id}`)).toEqual({ scene: "piezas", piece: piece.id });
  }
});

test("#reconocimiento lleva al juego y resalta la jugada de la foto; un hash cualquiera no se toca", () => {
  expect(resolveHash("#reconocimiento")).toEqual({ scene: "agente", move: "foto" });
  expect(resolveHash("#agente")).toBeNull();
  expect(resolveHash("")).toBeNull();
});
