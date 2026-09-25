import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * El texto sobre la marca (`--axi-on-brand`, el del CTA coral) depende de
 * DÓNDE se declara, no de su valor (DESIGN-SYSTEM §9.5.1):
 *
 * - `:root, .surface-light` lo calculan desde su `--axi-on-color`.
 * - `.dark` (la página oscura y los envoltorios `dark theme-dark-island` de la
 *   landing) lo recalcula con el suyo: sin esto el CTA de /productos queda
 *   blanco sobre el coral claro, 2,7:1 (auditoría island-glass, R2-1).
 * - `.surface-dark` NO lo declara: una isla de tinta en tema claro hereda el
 *   blanco de la página para su CTA.
 *
 * Un test textual porque jsdom no resuelve el CSS; lo que se fija es la regla.
 */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Los bloques cuya lista de selectores es exactamente `selectors`. */
function block(selectors: string): string {
  const head = `\n${selectors} {`;
  const start = css.indexOf(head);
  if (start === -1) throw new Error(`sin bloque «${selectors}»`);
  return css.slice(start, css.indexOf("\n}", start));
}

describe("superficies: el texto sobre la marca", () => {
  it(":root y .surface-light lo derivan de su on-color", () => {
    expect(block(":root,\n.surface-light")).toMatch(/--axi-on-brand:\s*var\(--axi-on-color\)/);
  });

  it("todo .dark lo recalcula con el suyo (el CTA de la landing oscura)", () => {
    expect(block(".dark")).toMatch(/--axi-on-brand:\s*var\(--axi-on-color\)/);
  });

  it("el bloque oscuro compartido con .surface-dark no lo declara (la isla hereda el blanco)", () => {
    expect(block(".dark,\n.surface-dark,\n.dark .surface-light")).not.toContain("--axi-on-brand");
  });

  it("el CTA usa --axi-on-brand, no --axi-on-color", () => {
    expect(css).toMatch(/--color-primary-foreground:\s*var\(--axi-on-brand\)/);
  });
});
