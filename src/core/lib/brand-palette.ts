/**
 * Paleta de marca leída de los tokens CSS (`--axi-brand`, `--axi-amber`,
 * `--axi-violet`) en tiempo de ejecución: así los efectos de canvas (haces de
 * la landing, confeti de la bienvenida) pintan con el color del tema activo y
 * ningún componente escribe un hex (DESIGN-SYSTEM §1). Se lee con
 * `getComputedStyle` sobre el elemento que se pase, normalmente
 * `document.documentElement`, donde viven los tokens.
 */

export type Rgb = readonly [number, number, number];

export const BRAND_TOKENS = ["--axi-brand", "--axi-amber", "--axi-violet"] as const;

/** Coral por si el token no llegara (nunca debería: está en `:root`). */
export const BRAND_FALLBACK: Rgb = [230, 87, 89];

export function hexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Los tres colores de marca del tema activo, en el orden coral · ámbar · violeta. */
export function readBrandPalette(el: Element): Rgb[] {
  const styles = getComputedStyle(el);
  return BRAND_TOKENS.map((token) => hexToRgb(styles.getPropertyValue(token)) ?? BRAND_FALLBACK);
}

/** La misma paleta como cadenas CSS (`rgb(r, g, b)`), para librerías que no aceptan tuplas. */
export function readBrandPaletteCss(el: Element): string[] {
  return readBrandPalette(el).map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
}
