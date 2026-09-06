import { readFileSync } from "node:fs";
import { join } from "node:path";

// El loader es `server-only`; en jest (jsdom) el centinela lanza y aquí solo
// interesa la constante.
jest.mock("server-only", () => ({}));

import { CATALOG_REVALIDATE_SECONDS } from "@/modules/landing/infrastructure/pricing-catalog.loader";

/**
 * Guardián del ISR del catálogo público (Tanda A3, plan §3.11).
 *
 * Next exige que la config de segmento (`export const revalidate`) sea un
 * literal analizable estáticamente: importar la constante del loader rompe el
 * build («Unknown identifier … at revalidate», visto el 2026-09-06). Las
 * páginas la repiten a mano; este spec impide que el literal y el `revalidate`
 * del `fetch` diverjan sin que nadie lo note.
 */
const PAGES = ["src/app/(public)/page.tsx", "src/app/(public)/precios/page.tsx", "src/app/comenzar/page.tsx"];

describe("revalidate de las páginas con catálogo público", () => {
  it.each(PAGES)("%s declara el mismo literal que el loader", (page) => {
    const source = readFileSync(join(process.cwd(), page), "utf8");
    const match = /^export const revalidate = (\d+);/m.exec(source);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(CATALOG_REVALIDATE_SECONDS);
    expect(source).not.toMatch(/revalidate = CATALOG_REVALIDATE_SECONDS/);
  });
});
