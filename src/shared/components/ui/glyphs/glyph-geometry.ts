/**
 * Geometría de las diez familias del set de cristal ilustrado
 * (DESIGN-SYSTEM §7). Datos puros: ni JSX ni color — el material entero vive en
 * el bloque `.glass-glyph` de `globals.css` y llega por `data-layer` /
 * `data-stop`. Por eso aquí no hay ni un hex.
 *
 * **Rejilla PAR de un `viewBox` de 48×48.** Los tres tamaños del sistema son
 * 48 / 96 / 176 px, así que una unidad mide 1, 2 y 3,67 píxeles: a 48 y a 96 la
 * rejilla cae exacta en frontera de píxel, que es donde importa. Si la
 * geometría se mueve a impares, el tamaño pequeño sale borroso.
 *
 * **`core` es la luz de color, y va DETRÁS del cuerpo translúcido.** No es un
 * tinte encima del glifo: es un objeto de color que se ve *a través* del vidrio.
 * Está colocado a mano en cada familia y remansado lejos del foco especular —
 * la luz entra por arriba-izquierda, así que el color se acumula en el lado
 * opuesto. Una elipse en la misma posición para las diez caía en sitios
 * absurdos, y centrada con alfa alta salían manchas en vez de luz.
 */

/** Las diez familias. El orden es el del inventario de estados vacíos. */
export const GLYPH_KINDS = [
  "conversation",
  "people",
  "catalog",
  "money",
  "ai",
  "connections",
  "metrics",
  "time",
  "uptodate",
  "noresults",
] as const;

export type GlyphKind = (typeof GLYPH_KINDS)[number];

/**
 * Acento que consume cada familia. El glifo **no elige su color**: lo hereda de
 * la clase `.glass-glyph--*`, y así se cumple sin esfuerzo la regla de un
 * acento por vista (DESIGN §3.1).
 */
export type GlyphAccent = "violet" | "amber" | "brand" | "success" | "muted";

/** La luz de color: elipse detrás del cuerpo, recortada a la silueta. */
type GlyphCore = { cx: number; cy: number; rx: number; ry: number };

export type GlyphGeometry = {
  /** Formas del fondo (la segunda burbuja, la moneda, el mango de la lupa…). */
  readonly back: string | null;
  /** La forma principal. Admite varios subpaths (las tres barras, el busto). */
  readonly front: string;
  /** Detalle interior, solo trazo. Es lo que distingue una familia de otra. */
  readonly engrave: readonly string[];
  readonly core: GlyphCore;
  readonly accent: GlyphAccent;
};

export const GLYPH_GEOMETRY: Record<GlyphKind, GlyphGeometry> = {
  conversation: {
    back: "M28 6H40A4 4 0 0 1 44 10V18A4 4 0 0 1 40 22H28A4 4 0 0 1 24 18V10A4 4 0 0 1 28 6Z",
    front:
      "M12 14H28A6 6 0 0 1 34 20V28A6 6 0 0 1 28 34H18L8 42L12 34A6 6 0 0 1 6 28V20A6 6 0 0 1" +
      " 12 14Z",
    engrave: ["M14 22H26", "M14 28H22"],
    core: { cx: 13, cy: 28, rx: 13, ry: 10 },
    accent: "violet",
  },
  people: {
    back: "M28 12A6 6 0 1 0 40 12A6 6 0 1 0 28 12Z M26 34C26 24 46 24 46 34Z",
    front: "M10 16A8 8 0 1 0 26 16A8 8 0 1 0 10 16Z M4 42C4 28 32 28 32 42Z",
    engrave: [],
    core: { cx: 14, cy: 38, rx: 14, ry: 9 },
    accent: "violet",
  },
  catalog: {
    back: "M14 20L24 6H42L32 20Z",
    front:
      "M10 20H38A2 2 0 0 1 40 22V38A4 4 0 0 1 36 42H12A4 4 0 0 1 8 38V22A2 2 0 0 1 10 20Z",
    engrave: ["M24 20V42", "M8 28H40"],
    core: { cx: 19, cy: 36, rx: 15, ry: 9 },
    accent: "violet",
  },
  money: {
    back: "M28 32A8 8 0 1 0 44 32A8 8 0 1 0 28 32Z",
    front:
      "M16 6H32A4 4 0 0 1 36 10V40L31 36L26 40L21 36L16 40L12 36V10A4 4 0 0 1 16 6Z",
    engrave: ["M18 16H30", "M18 22H26"],
    core: { cx: 20, cy: 32, rx: 13, ry: 10 },
    accent: "amber",
  },
  ai: {
    back: "M10 32C11 35 12 36 15 37C12 38 11 39 10 42C9 39 8 38 5 37C8 36 9 35 10 32Z",
    front:
      "M24 4C26 16 32 22 44 24C32 26 26 32 24 44C22 32 16 26 4 24C16 22 22 16 24 4Z",
    engrave: [],
    core: { cx: 22, cy: 26, rx: 13, ry: 13 },
    accent: "violet",
  },
  connections: {
    back: "M18 4H22V16H18Z M26 4H30V16H26Z",
    front:
      "M18 14H30A6 6 0 0 1 36 20V26A10 10 0 0 1 26 36H22A10 10 0 0 1 12 26V20A6 6 0 0 1 18 14Z",
    engrave: ["M12 22H36", "M24 36V44"],
    core: { cx: 22, cy: 33, rx: 12, ry: 7 },
    accent: "brand",
  },
  metrics: {
    back: null,
    front:
      "M8 26H14A2 2 0 0 1 16 28V40A2 2 0 0 1 14 42H8A2 2 0 0 1 6 40V28A2 2 0 0 1 8 26Z M22" +
      " 18H28A2 2 0 0 1 30 20V40A2 2 0 0 1 28 42H22A2 2 0 0 1 20 40V20A2 2 0 0 1 22 18Z M36" +
      " 8H42A2 2 0 0 1 44 10V40A2 2 0 0 1 42 42H36A2 2 0 0 1 34 40V10A2 2 0 0 1 36 8Z",
    engrave: ["M10 22L24 14L40 6"],
    core: { cx: 20, cy: 39, rx: 18, ry: 8 },
    accent: "violet",
  },
  time: {
    back: "M20 4H28A2 2 0 0 1 30 6V12H18V6A2 2 0 0 1 20 4Z",
    front: "M8 26A16 16 0 1 0 40 26A16 16 0 1 0 8 26Z",
    engrave: ["M14 26A10 10 0 1 0 34 26A10 10 0 1 0 14 26Z", "M24 18V26H31"],
    core: { cx: 21, cy: 32, rx: 14, ry: 10 },
    accent: "amber",
  },
  uptodate: {
    back: null,
    front: "M24 4L40 10V24C40 34 33 41 24 44C15 41 8 34 8 24V10L24 4Z",
    engrave: ["M16 24L21 30L32 18"],
    core: { cx: 21, cy: 30, rx: 14, ry: 11 },
    accent: "success",
  },
  noresults: {
    back: "M30 34L34 30L43 39A3 3 0 0 1 39 43Z",
    front: "M6 20A14 14 0 1 0 34 20A14 14 0 1 0 6 20Z",
    engrave: ["M12 16A10 10 0 0 1 20 10"],
    core: { cx: 20, cy: 26, rx: 12, ry: 9 },
    accent: "muted",
  },
};
