/**
 * La cámara de la meta y todo el fotograma de la escena (plan §16.1), en
 * función del progreso `p` (0–1) del pin. Puro: el servidor pinta `goalFrame(1)`
 * y el motor pinta `goalFrame(p)` en cada frame, con los mismos números.
 *
 * La cámara es UN transform sobre el plano del mundo, con `perspective` en el
 * contenedor y `transform-origin: 0 0`:
 *
 *   translate(foco) rotateX(inclinación) rotateZ(giro) scale(s) translate(−centro)
 *
 * El `translate(foco)` lo pone el CSS (el plano se coloca en el foco con
 * `left`/`top` en porcentaje, y `perspective-origin` es ese mismo punto), así
 * que el resto de la cadena no depende del tamaño de la pantalla. Las marcas
 * HTML (coche, «Vas aquí», anillos, bandera) se colocan en el foco y se mueven
 * con `project`, que aplica la misma matriz: quedan de frente y no se tuercen.
 */
import { GOAL_ROUTE, GOAL_WORLD, goalPointAt, type Point, type SampledRoute } from "./route-map";
import { ROUTE_FRACTIONS } from "./route-scenario";

/** `perspective` del contenedor, en px. */
export const GOAL_PERSPECTIVE = 1300;

/** El foco como fracción del escenario: (600, 600) de 1440 × 900 y (170, 250) de la franja de 390 × 430. */
export const GOAL_FOCUS = {
  desktop: { x: 600 / 1440, y: 600 / 900 },
  mobile: { x: 170 / 390, y: 250 / 430 },
} as const;

export type GoalCamera = {
  /** Punto del mundo que queda en el foco. */
  center: Point;
  scale: number;
  /** Inclinación (rotateX) y giro (rotateZ), en grados. */
  tilt: number;
  turn: number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** El tramo [a, b] de `p`, llevado a 0–1. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** La fracción de la ruta en la que va el coche: 0 hasta 0,12 y luego hasta el 63 % en 0,12–0,5. */
export function carFraction(p: number): number {
  return ROUTE_FRACTIONS.done * easeInOut(seg(p, 0.12, 0.5));
}

/**
 * La cámara en `p`:
 * - 0–0,12: baja sobre la ciudad (inclinación 0 → 52°, escala 0,42 → 1, giro 0 → −7°) del centro del mapa a la salida;
 * - 0,12–0,6: sigue al coche;
 * - 0,6–0,72: se aleja (escala 0,66, 42°) hasta el 62 % entre el coche y el 80 % de la ruta.
 */
export function goalCamera(p: number, route: SampledRoute = GOAL_ROUTE): GoalCamera {
  const car = goalPointAt(carFraction(p), route);
  const intro = easeOut(seg(p, 0, 0.12));
  const pull = easeOut(seg(p, 0.6, 0.72));
  const over = goalPointAt(0.8, route);
  const middle = { x: GOAL_WORLD.w / 2, y: GOAL_WORLD.h / 2 };
  const follow = mix(middle, car, intro);
  return {
    center: mix(follow, mix(car, over, 0.62), pull),
    scale: lerp(lerp(0.42, 1, intro), 0.66, pull),
    tilt: lerp(lerp(0, 52, intro), 42, pull),
    turn: lerp(0, -7, intro),
  };
}

/** El transform del plano, sin el `translate(foco)` (lo pone el CSS). */
export function planeTransform(cam: GoalCamera): string {
  return (
    `rotateX(${cam.tilt.toFixed(2)}deg) rotateZ(${cam.turn.toFixed(2)}deg) ` +
    `scale(${cam.scale.toFixed(4)}) translate(${(-cam.center.x).toFixed(1)}px, ${(-cam.center.y).toFixed(1)}px)`
  );
}

/**
 * Dónde cae en pantalla un punto del mundo, en px desde el foco: la misma
 * cadena que `planeTransform` más la perspectiva (con su origen en el foco).
 */
export function project(cam: GoalCamera, w: Point, perspective = GOAL_PERSPECTIVE): Point {
  const dx = (w.x - cam.center.x) * cam.scale;
  const dy = (w.y - cam.center.y) * cam.scale;
  const r = (cam.turn * Math.PI) / 180;
  const a = (cam.tilt * Math.PI) / 180;
  const rx = dx * Math.cos(r) - dy * Math.sin(r);
  const ry = dx * Math.sin(r) + dy * Math.cos(r);
  const y = ry * Math.cos(a);
  const z = ry * Math.sin(a);
  const k = perspective / (perspective - z);
  return { x: rx * k, y: y * k };
}

/** Hacia dónde apunta el coche en pantalla (grados, 0 = arriba), según la ruta proyectada. */
export function heading(cam: GoalCamera, f: number, route: SampledRoute = GOAL_ROUTE): number {
  const a = project(cam, goalPointAt(f, route));
  const b = project(cam, goalPointAt(Math.min(1, f + 0.01), route));
  if (f >= 0.99) {
    const c = project(cam, goalPointAt(0.98, route));
    return (Math.atan2(a.y - c.y, a.x - c.x) * 180) / Math.PI + 90;
  }
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
}

/** Un trazo que se revela sobre la ruta entera con `pathLength=1`: el tramo [from, to]. */
export function dashWindow(from: number, to: number): string {
  const len = Math.max(0, to - from);
  return from <= 0 ? `${Math.max(0.0001, len).toFixed(4)} 2` : `0 ${from.toFixed(4)} ${Math.max(0.0001, len).toFixed(4)} 2`;
}

/** Las marcas proyectadas de la escena. */
export type GoalMarks = { car: Point; start: Point; should: Point; ring: Point; flag: Point };

/**
 * El fotograma de la escena en `p`, con los tramos de la tabla de §16.1. Los
 * valores van de 0 a 1 (opacidades y avances); el motor los escribe tal cual.
 */
export function goalFrame(p: number, route: SampledRoute = GOAL_ROUTE) {
  const F = ROUTE_FRACTIONS;
  const cam = goalCamera(p, route);
  const car = carFraction(p);
  const land = easeOut(seg(p, 0, 0.12));
  const slow = easeOut(seg(p, 0.5, 0.58));
  const proj = easeOut(seg(p, 0.6, 0.7));
  const axi = easeOut(seg(p, 0.72, 0.8));
  const ok = easeOut(seg(p, 0.84, 0.9));
  const approved = ok > 0.5;
  const arrive = lerp(F.projected, F.projectedWithRoute, ok);
  const at = (f: number) => project(cam, goalPointAt(f, route));
  const marks: GoalMarks = {
    car: at(car),
    start: at(0),
    should: at(F.expected),
    ring: at(lerp(F.done, arrive, Math.max(proj, ok))),
    flag: at(1),
  };
  return {
    cam,
    plane: planeTransform(cam),
    marks,
    /** La fracción recorrida: la del coche, la cifra y la barra. */
    car,
    carHeading: heading(cam, car, route),
    arrive,
    approved,
    /** Opacidades. */
    // El titular y el panel llegan a pleno al pin: entran con el scroll de antes
    // (el `reveal` de `sceneTimeline`, data-anim="head"). Con la entrada dentro
    // del pin la escena llegaba arriba vacía y, en móvil, el titular asomaba a 0
    // (barrido del 2026-10-01).
    head: 1,
    panel: 1,
    carMark: land,
    here: easeOut(seg(p, 0.14, 0.2)),
    start: land * (1 - easeOut(seg(p, 0.4, 0.5))),
    // Tras aprobar, el tramo lento queda de fondo, no lavado (en claro, a 0,4 no se leía).
    should: slow * (1 - 0.45 * ok),
    slowChip: slow * (1 - ok),
    ring: Math.max(proj, ok),
    flag: proj,
    routeNow: easeOut(seg(p, 0.62, 0.7)) * (1 - 0.55 * ok),
    routeAxi: easeOut(seg(p, 0.72, 0.78)),
    recalc: easeOut(seg(p, 0.7, 0.74)) * (1 - easeOut(seg(p, 0.92, 0.97))),
    axiGlow: 0.45 * axi * (1 - ok),
    /** Los trazos que aún no empiezan se ocultan: un tramo de largo 0 con punta redonda pintaría un punto. */
    doneLine: car > 0 ? 1 : 0,
    axiLine: axi > 0 ? 1 : 0,
    projection: 0.75 * (1 - ok),
    /**
     * Trazos (`stroke-dasharray` con `pathLength=1`). El recorrido y la ruta de
     * Axi son trazos llenos sobre la ruta entera; el tramo lento y la
     * proyección llevan su propio punteado, así que se revelan con la máscara
     * de su tramo fijo (`slow`, `projection`: el avance dentro de ese tramo).
     */
    dash: {
      done: dashWindow(0, car),
      axi: dashWindow(F.done, lerp(F.done, F.projectedWithRoute, axi)),
      slow: dashWindow(0, slow),
      projection: dashWindow(0, proj),
    },
    /** El tramo lento en la barra del panel, como fracción de su ancho. */
    barSlow: (F.expected - F.done) * slow,
    /** El botón se hunde en 0,82–0,84 y vuelve al aprobarse. */
    button: approved ? 1 : 1 - 0.06 * easeOut(seg(p, 0.82, 0.84)),
    /** El pulso del coche, ligado al scroll (no a un reloj). */
    pulse: 1 + 0.25 * Math.sin(p * 60),
  };
}

export type GoalFrame = ReturnType<typeof goalFrame>;
