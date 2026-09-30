/**
 * El hilo de luz de la película: la geometría, en TypeScript puro.
 *
 * Un solo haz recorre toda la home. Cada escena declara por dónde pasa (anclas en
 * % de su caja, `thread-path.ts`) y este módulo responde, sin tocar el DOM:
 *
 * 1. `timeAnchors`: en qué posición de scroll llega la luz a cada ancla. Se
 *    calcula UNA vez por refresh. En una escena libre, cuando el ancla cruza la
 *    línea de la cabeza (`HEAD_AT` de la pantalla). En una escena fijada (pin) nada
 *    se mueve, así que la luz avanza con el progreso del pin.
 * 2. `sceneTop`: dónde está la caja de la escena en pantalla para un scroll dado.
 *    Es aritmética pura (libre: `top − scroll`; fijada: `start − scroll`, 0 o
 *    `end − scroll`), así que cada frame se resuelve sin `getBoundingClientRect`.
 * 3. `sampleLit` y `resampleSpine`: el tramo iluminado y visible, muestreado
 *    como Catmull-Rom, y su «columna» a igual distancia para el renderer.
 *
 * El renderer (WebGL o 2D) vive en `ui/film/thread/`; aquí no hay nada de él.
 */

/** Un punto del recorrido en % de la caja de su escena (x del ancho, y del alto). */
export type ThreadPoint = {
  x: number;
  y: number;
  /** 0 = tinta (hilo blanco); 1 = momento de marca (haz abierto en coral, ámbar y violeta). */
  brand?: number;
  /** La escena se «enciende» cuando la luz llega a este punto. */
  ignite?: boolean;
  /**
   * Solo si la escena se fija: en qué fracción del pin (0–1) llega la luz aquí.
   * Por defecto sale de `y`; sirve para un tramo horizontal (el horizonte de Axel,
   * las fibras de medir), que por su `y` se cruzaría de golpe. En una escena libre
   * se ignora: ahí la luz llega cuando el punto cruza la cabeza.
   */
  pin?: number;
};

export type SceneBox = { width: number; height: number; viewportHeight: number };

/** El tramo de una escena: puntos fijos o calculados a partir de su caja (el mapa de la meta). */
export type SceneThread = {
  scene: string;
  points?: readonly ThreadPoint[];
  resolve?: (box: SceneBox) => ThreadPoint[];
};

export type ThreadPath = {
  enabled: boolean;
  desktop: readonly SceneThread[];
  mobile: readonly SceneThread[];
};

export type PinRange = { start: number; end: number };

/** Lo que el renderer mide de una escena en cada refresh. `top` en coordenadas de scroll. */
export type SceneMeasure = { top: number; width: number; height: number; pin: PinRange | null };

export type Anchor = {
  scene: string;
  /** Fracciones 0–1 de la caja de la escena. */
  x: number;
  y: number;
  brand: number;
  ignite: boolean;
  /** Posición de scroll en la que la luz llega aquí. Estrictamente creciente. */
  at: number;
  top: number;
  height: number;
  pin: PinRange | null;
};

export type Sample = { x: number; y: number; brand: number };

/** La cabeza del haz va a esta altura de la pantalla (0 arriba, 1 abajo). */
export const HEAD_AT = 0.62;

/**
 * Dentro de un pin, la luz termina su recorrido antes de que el pin se suelte:
 * el último tramo queda iluminado mientras la escena sigue fijada.
 */
const PIN_SHARE = 0.92;

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

export function timeAnchors(
  path: readonly SceneThread[],
  measure: (scene: string) => SceneMeasure | null,
  viewportHeight: number,
): Anchor[] {
  const head = viewportHeight * HEAD_AT;
  const out: Anchor[] = [];
  for (const s of path) {
    const m = measure(s.scene);
    if (!m) continue; // la escena no está en esta página: su tramo no existe
    const points = s.resolve ? s.resolve({ width: m.width, height: m.height, viewportHeight }) : (s.points ?? []);
    for (const p of points) {
      const localY = (p.y / 100) * m.height;
      let at = m.top + localY - head;
      if (m.pin && (p.pin !== undefined || at > m.pin.start)) {
        // Una fracción explícita es exacta (se sincroniza con la línea de tiempo de la
        // escena); la que sale de `y` termina antes de soltar el pin (PIN_SHARE).
        const f = p.pin !== undefined ? clamp(p.pin) : clamp((localY - head) / Math.max(1, m.height - head)) * PIN_SHARE;
        at = m.pin.start + f * (m.pin.end - m.pin.start);
      }
      out.push({
        scene: s.scene,
        x: p.x / 100,
        y: p.y / 100,
        brand: clamp(p.brand ?? 0),
        ignite: p.ignite === true,
        at,
        top: m.pin ? m.pin.start : m.top,
        height: m.height,
        pin: m.pin,
      });
    }
  }
  if (!out.length) return out;
  // El primer tramo se ve al cargar; después, cada ancla llega estrictamente más tarde.
  out[0].at = Math.min(out[0].at, -1);
  for (let i = 1; i < out.length; i++) out[i].at = Math.max(out[i].at, out[i - 1].at + 1);
  return out;
}

/** El borde superior de la escena de `a` en pantalla, para un scroll dado. */
export function sceneTop(a: Pick<Anchor, "top" | "pin">, scroll: number): number {
  if (a.pin) {
    const { start, end } = a.pin;
    return scroll < start ? start - scroll : scroll > end ? end - scroll : 0;
  }
  return a.top - scroll;
}

/**
 * Hasta dónde llegó la luz: el ancla `index` ya está iluminada y la cabeza va a
 * `u` (0–1) del camino hacia la siguiente. `done` cuando pasó la última.
 */
export function headAt(anchors: readonly Anchor[], scroll: number): { index: number; u: number; done: boolean } {
  if (!anchors.length) return { index: -1, u: 0, done: true };
  let i = 0;
  while (i < anchors.length - 1 && anchors[i + 1].at <= scroll) i++;
  const next = anchors[i + 1];
  if (!next) return { index: i, u: 1, done: true };
  return { index: i, u: clamp((scroll - anchors[i].at) / (next.at - anchors[i].at)), done: false };
}

/** Qué fracción del tramo de su escena recorrió la cabeza (para «vas aquí» en la meta). */
export function sceneFraction(anchors: readonly Anchor[], head: { index: number; u: number }): number {
  const scene = anchors[head.index]?.scene;
  if (scene === undefined) return 0;
  let first = head.index;
  while (first > 0 && anchors[first - 1].scene === scene) first--;
  let last = head.index;
  while (last < anchors.length - 1 && anchors[last + 1].scene === scene) last++;
  if (last === first) return 1;
  return clamp((head.index - first + (head.index < last ? head.u : 0)) / (last - first));
}

function catmullRom(p0: Sample, p1: Sample, p2: Sample, p3: Sample, t: number, out: Sample) {
  const t2 = t * t;
  const t3 = t2 * t;
  out.x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  out.y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  out.brand = p1.brand + (p2.brand - p1.brand) * t;
}

/**
 * El tramo iluminado en pantalla, de la cola a la cabeza, en `out` (se reutiliza
 * entre frames para no generar basura). Omite los segmentos lejos de la pantalla.
 * Devuelve cuántas muestras escribió.
 */
export function sampleLit(
  anchors: readonly Anchor[],
  scroll: number,
  viewport: { width: number; height: number },
  head: { index: number; u: number; done: boolean },
  out: Sample[],
  step = 12,
): number {
  let n = 0;
  if (anchors.length < 2 || head.index < 0) return 0;
  const P: Sample[] = anchors.map((a) => ({ x: a.x * viewport.width, y: sceneTop(a, scroll) + a.y * a.height, brand: a.brand }));
  const last = head.done ? anchors.length - 2 : head.index;
  for (let k = 0; k <= last; k++) {
    const p1 = P[k];
    const p2 = P[k + 1];
    if (Math.max(p1.y, p2.y) < -viewport.height || Math.min(p1.y, p2.y) > viewport.height * 1.25) continue;
    const p0 = P[k - 1] ?? p1;
    const p3 = P[k + 2] ?? p2;
    const end = k === head.index && !head.done ? head.u : 1;
    const segs = Math.max(6, Math.ceil((Math.hypot(p2.x - p1.x, p2.y - p1.y) / step) * end));
    for (let j = n ? 1 : 0; j <= segs; j++) {
      const s = out[n] ?? (out[n] = { x: 0, y: 0, brand: 0 });
      catmullRom(p0, p1, p2, p3, (j / segs) * end, s);
      n++;
    }
  }
  return n;
}

/**
 * La columna del haz: `count` puntos a igual distancia de arco, de la cola
 * (índice 0) a la cabeza (índice `count − 1`), hasta `maxLength` px detrás de la
 * cabeza. Cada punto ocupa 4 floats: x, y, marca y distancia a la cabeza.
 * Devuelve la longitud cubierta (0 si no hay nada que dibujar).
 */
export function resampleSpine(samples: readonly Sample[], n: number, count: number, maxLength: number, out: Float32Array): number {
  if (n < 2) return 0;
  // Distancia acumulada desde la cabeza hacia atrás.
  const dist: number[] = [0];
  let acc = 0;
  let j = n - 1;
  while (j > 0 && acc < maxLength) {
    acc += Math.hypot(samples[j].x - samples[j - 1].x, samples[j].y - samples[j - 1].y);
    dist.push(acc);
    j--;
  }
  const length = Math.min(acc, maxLength);
  if (length < 2) return 0;
  // Se recorre de la cabeza a la cola: la distancia buscada solo crece, igual que
  // el índice del segmento. (Al revés, todos los puntos caían en la cola.)
  let seg = 0;
  for (let k = count - 1; k >= 0; k--) {
    const want = length * (1 - k / (count - 1));
    while (seg < dist.length - 2 && dist[seg + 1] < want) seg++;
    const a = samples[n - 1 - seg];
    const b = samples[Math.max(0, n - 2 - seg)];
    const f = clamp((want - dist[seg]) / (dist[seg + 1] - dist[seg] || 1));
    out[k * 4] = a.x + (b.x - a.x) * f;
    out[k * 4 + 1] = a.y + (b.y - a.y) * f;
    out[k * 4 + 2] = a.brand + (b.brand - a.brand) * f;
    out[k * 4 + 3] = want;
  }
  return length;
}
