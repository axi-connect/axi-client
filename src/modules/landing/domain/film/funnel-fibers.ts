/**
 * Las fibras de «Medir» (plan §11, lienzo aprobado el 2026-09-30): una fibra por
 * conversación que cruza cuatro puertas (conversaciones → cotizaciones → pedidos
 * → ventas pagadas). Las que no llegan se apagan en su puerta con un punto; las
 * que llegan convergen en lo que produjeron. TypeScript puro: la escena pinta
 * estas rutas en un SVG estático y el motor solo lo revela.
 *
 * Cuántas fibras pasan cada puerta sale de las cifras del nicho (`measure.steps`):
 * el embudo que se ve es el mismo que dicen los números.
 */

export type FunnelLayout = {
  /** El `viewBox` del SVG (coordenadas del lienzo). */
  view: { x: number; y: number; w: number; h: number };
  /** La x de cada una de las cuatro puertas. */
  gates: readonly [number, number, number, number];
  /** La franja vertical por la que entran las fibras. */
  band: readonly [number, number];
  /** La altura hacia la que se aprietan (el eje del embudo). */
  cy: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  fibers: number;
  /** Cuánto se aprieta el haz en cada puerta (1 = la franja entera). */
  squeeze: readonly [number, number, number, number];
  /** Controles de las curvas de entrada y de llegada (x). */
  startCtrl: readonly [number, number];
  endCtrl: readonly [number, number];
  /** La fibra que no pasa: sale `stub` px tras su puerta, con controles a `+a` y `−b`. */
  lost: { a: number; b: number; stub: number };
  /** Multiplicador (coprimo con `fibers`) que baraja qué fibra llega hasta dónde. */
  shuffle: number;
};

/** Escritorio: las medidas del lienzo a 1440 × 900. */
export const FUNNEL_DESKTOP: FunnelLayout = {
  view: { x: 80, y: 420, w: 1200, h: 440 },
  gates: [280, 540, 800, 1060],
  band: [446, 786],
  cy: 628,
  start: { x: 100, y: 560 },
  end: { x: 1180, y: 632 },
  fibers: 56,
  squeeze: [1, 0.7, 0.45, 0.28],
  startCtrl: [170, 190],
  endCtrl: [1120, 1140],
  lost: { a: 30, b: 20, stub: 60 },
  shuffle: 37,
};

/** Móvil: el tablero de 390 px del lienzo. */
export const FUNNEL_MOBILE: FunnelLayout = {
  view: { x: 20, y: 2872, w: 356, h: 214 },
  gates: [70, 160, 250, 330],
  band: [2892, 3080],
  cy: 2986,
  start: { x: 34, y: 2984 },
  end: { x: 355, y: 2988 },
  fibers: 36,
  squeeze: [1, 0.7, 0.45, 0.28],
  startCtrl: [50, 52],
  endCtrl: [342, 348],
  lost: { a: 12, b: 8, stub: 26 },
  shuffle: 23,
};

/**
 * Cuántas fibras pasan cada puerta, proporcional a las cifras (la primera, todas).
 * Nunca menos de una ni más que la puerta anterior.
 */
export function funnelKeep(counts: readonly number[], fibers: number): [number, number, number, number] {
  const first = Math.max(1, counts[0] ?? 1);
  const keep: number[] = [fibers];
  for (let k = 1; k < 4; k++) {
    const want = Math.max(1, Math.round((fibers * (counts[k] ?? 0)) / first));
    keep.push(Math.min(keep[k - 1], want));
  }
  return keep as [number, number, number, number];
}

const f1 = (n: number) => n.toFixed(1);

/**
 * Las tres rutas del embudo, cada una una sola `path` con muchos subtrazos:
 * `lost` (las que se apagan), `dots` (su punto final) y `won` (las que llegan).
 */
export function funnelPaths(layout: FunnelLayout, counts: readonly number[]): { lost: string; won: string; dots: string } {
  const { gates, band, cy, start, end, fibers: N, squeeze, startCtrl, endCtrl, lost: out, shuffle } = layout;
  const keep = funnelKeep(counts, N);
  let lost = "";
  let won = "";
  let dots = "";
  for (let i = 0; i < N; i++) {
    const r = (i * shuffle) % N;
    const y0 = band[0] + ((band[1] - band[0]) * (i + 0.5)) / N;
    let last = 0;
    for (let k = 1; k < 4; k++) if (r < keep[k]) last = k;
    const ys = squeeze.map((s) => cy + (y0 - cy) * s);
    let d = `M${start.x} ${start.y} C ${startCtrl[0]} ${start.y}, ${startCtrl[1]} ${f1(y0)}, ${gates[0]} ${f1(y0)}`;
    for (let k = 1; k <= last; k++) {
      const x0 = gates[k - 1];
      const x1 = gates[k];
      const m = (x1 - x0) / 2;
      d += ` C ${x0 + m} ${f1(ys[k - 1])}, ${x1 - m} ${f1(ys[k])}, ${x1} ${f1(ys[k])}`;
    }
    if (last === 3) {
      won += `${d} C ${endCtrl[0]} ${f1(ys[3])}, ${endCtrl[1]} ${end.y}, ${end.x} ${end.y} `;
    } else {
      const xe = gates[last] + out.stub;
      const ye = ys[last] + (ys[last] - cy) * 0.15;
      lost += `${d} C ${gates[last] + out.a} ${f1(ys[last])}, ${xe - out.b} ${f1(ye)}, ${xe} ${f1(ye)} `;
      dots += `M${xe} ${f1(ye)} h.01 `;
    }
  }
  return { lost: lost.trim(), won: won.trim(), dots: dots.trim() };
}

/** Un número del guion («1.240», «$ 48,6 M») como número: dígitos, con la coma decimal. */
export function parseFigure(text: string): number {
  const millions = /\bM\b/.test(text);
  const n = Number(text.replace(/[^\d,]/g, "").replace(",", "."));
  return millions ? n * 1_000_000 : n;
}
