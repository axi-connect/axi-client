/**
 * El vuelo del piloto y todo el fotograma de la escena (plan §19.4), en
 * función del progreso `p` (0–1) del pin. Puro: el servidor pinta
 * `pilotFrame(1)` y el motor pinta `pilotFrame(p)` en cada frame, con los
 * mismos números.
 *
 * La cámara es la de la meta (`goal-camera.ts`): el mismo transform del plano,
 * la misma proyección y las mismas curvas; aquí solo cambia su guion.
 */
import {
  FLIGHT_AIRPORT,
  FLIGHT_CONTROL,
  FLIGHT_FIXES,
  FLIGHT_HOLD,
  FLIGHT_HOLD_FRACTION,
  FLIGHT_ZONE_CENTER,
  flightPointAt,
  holdPoint,
} from "./flight-route";
import { easeInOut, easeOut, planeTransform, project, seg, type GoalCamera } from "./goal-camera";
import type { PilotStage, PilotStatus } from "./pilot-content";
import type { Point } from "./route-map";

/** El foco como fracción del escenario: (520, 600) de 1440 × 900 y (170, 250) de la franja de 390 × 430. */
export const PILOT_FOCUS = {
  desktop: { x: 520 / 1440, y: 600 / 900 },
  mobile: { x: 170 / 390, y: 250 / 430 },
} as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
/** Entra en [a, b] y sale en [c, d], con ease de salida. */
const fade = (p: number, a: number, b: number, c: number, d: number) => easeOut(seg(p, a, b)) * (1 - easeOut(seg(p, c, d)));

export type PlaneState = {
  /** Fracción de la aerovía (en la espera, la del fijo 5). */
  f: number;
  at: Point;
  /** En el circuito de espera: el ángulo recorrido. */
  hold: number | null;
};

/**
 * El plan de vuelo:
 * - 0,1–0,52: de la torre al fijo 5 (entrada y salida);
 * - 0,52–0,64: una vuelta al circuito de espera;
 * - 0,64–0,68: quieto sobre el fijo 5 (se aprueba el lote);
 * - 0,68–0,9: del fijo 5 al aeropuerto.
 */
export function planeAt(p: number): PlaneState {
  if (p < 0.52) {
    const f = FLIGHT_HOLD_FRACTION * easeInOut(seg(p, 0.1, 0.52));
    return { f, at: flightPointAt(f), hold: null };
  }
  if (p < 0.64) {
    const th = Math.PI * 2 * easeInOut(seg(p, 0.52, 0.64));
    return { f: FLIGHT_HOLD_FRACTION, at: holdPoint(th), hold: th };
  }
  if (p < 0.68) return { f: FLIGHT_HOLD_FRACTION, at: flightPointAt(FLIGHT_HOLD_FRACTION), hold: null };
  const f = lerp(FLIGHT_HOLD_FRACTION, 1, easeInOut(seg(p, 0.68, 0.9)));
  return { f, at: flightPointAt(f), hold: null };
}

/** Adónde mira la cámara al alejarse al final: toda la ruta. */
const OVERVIEW: Point = { x: 1235, y: 840 };

/**
 * La cámara en `p`:
 * - 0–0,1: desde arriba (0°, escala 0,45) sobre la torre;
 * - 0,1–0,3: se pone detrás del avión (48°, escala 1, giro −6°);
 * - en la espera se aleja (× 0,8);
 * - 0,82–0,9: desciende (30°, escala 1,15);
 * - 0,9–1: se aleja a toda la ruta (escala 0,55, 22°, giro −3°).
 */
export function pilotCamera(p: number, plane: PlaneState = planeAt(p)): GoalCamera {
  const rise = easeOut(seg(p, 0.1, 0.3));
  let scale = lerp(0.45, 1, rise);
  let tilt = lerp(0, 48, rise);
  let turn = lerp(0, -6, rise);
  const hold = easeOut(seg(p, 0.52, 0.56)) * (1 - easeOut(seg(p, 0.64, 0.7)));
  scale *= lerp(1, 0.8, hold);
  const land = easeOut(seg(p, 0.82, 0.9));
  tilt = lerp(tilt, 30, land);
  scale = lerp(scale, 1.15, land);
  const out = easeOut(seg(p, 0.9, 1));
  scale = lerp(scale, 0.55, out);
  tilt = lerp(tilt, 22, out);
  turn = lerp(turn, -3, out);
  const follow = p < 0.1 ? FLIGHT_CONTROL[0] : plane.at;
  return { center: mix(follow, OVERVIEW, out), scale, tilt, turn };
}

/** Hacia dónde apunta el avión en pantalla (grados, 0 = arriba): la tangente proyectada. */
export function planeHeading(cam: GoalCamera, plane: PlaneState): number {
  const ahead = plane.hold !== null ? holdPoint(plane.hold + 0.15) : flightPointAt(Math.min(1, plane.f + 0.008));
  const back = plane.hold !== null ? holdPoint(plane.hold - 0.15) : flightPointAt(Math.max(0, plane.f - 0.008));
  const a = project(cam, ahead);
  const b = project(cam, back);
  return (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI + 90;
}

/**
 * El tablero de llegadas: cuándo voltea cada fila a cada etapa. La fila 1
 * aterriza en «Demo agendada»; la 5 es la que se omite del lote y termina en
 * «Descartado» (no todas las cuentas aterrizan).
 */
export const PILOT_BOARD: readonly (readonly [at: number, stage: PilotStage][])[] = [
  [[0.1, "searching"], [0.2, "enriching"], [0.34, "qualifying"], [0.7, "contacting"], [0.75, "following"], [0.79, "replied"], [0.87, "demo"]],
  [[0.1, "searching"], [0.21, "enriching"], [0.35, "qualifying"], [0.71, "contacting"], [0.76, "following"], [0.8, "replied"]],
  [[0.1, "searching"], [0.24, "enriching"], [0.36, "qualifying"], [0.72, "contacting"], [0.77, "following"]],
  [[0.1, "searching"], [0.25, "enriching"], [0.37, "qualifying"], [0.73, "contacting"], [0.78, "following"]],
  [[0.1, "searching"], [0.26, "enriching"], [0.38, "qualifying"], [0.8, "discarded"]],
];

/** Lo que dura el volteo de paleta de una fila. */
const FLIP = 0.014;

export type BoardRow = { stage: PilotStage | null; flip: number };

export function boardRow(p: number, timeline: readonly (readonly [number, PilotStage])[]): BoardRow {
  let stage: PilotStage | null = null;
  let since = -1;
  for (const [t, s] of timeline) {
    if (p >= t) {
      stage = s;
      since = t;
    }
  }
  return { stage, flip: since >= 0 ? 90 * (1 - easeOut(seg(p, since, since + FLIP))) : 0 };
}

/** Los tres relojes giran sobre el mismo fondo de escala. */
export const PILOT_DIAL_MAX = 25;

/** Un reloj: el arco (fracción de la circunferencia, 270° = 0,75) y la aguja (grados). */
export function dial(value: number, max = PILOT_DIAL_MAX): { arc: number; needle: number } {
  const k = Math.min(1, Math.max(0, value / max));
  return { arc: 0.75 * k, needle: -135 + 270 * k };
}

/** Los segmentos encendidos del medidor del tope. */
export function capSegments(contacted: number, cap: number, segments = 20): number {
  return Math.round((Math.min(contacted, cap) / cap) * segments);
}

export type PilotMarks = {
  plane: Point;
  fixes: Point[];
  tower: Point;
  airport: Point;
  zone: Point;
  /** Fijos 1, 3 y 6: las fuentes, la tarjeta del decisor y la burbuja. */
  sources: Point;
  people: Point;
  bubble: Point;
  holdLabel: Point;
};

export type PilotRun = { found: number; qualified: number; cap: number; approved: number };

/** El fotograma de la escena en `p`. Los valores van de 0 a 1 (opacidades y avances); el motor los escribe tal cual. */
export function pilotFrame(p: number, run: PilotRun) {
  const plane = planeAt(p);
  const cam = pilotCamera(p, plane);
  const at = (w: Point) => project(cam, w);
  const lit = FLIGHT_FIXES.map((f) => p >= 0.1 && plane.f >= f - 0.002);
  const passed = FLIGHT_FIXES.filter((f) => plane.f >= f - 0.002).length;
  const step = p < 0.1 ? 0 : Math.min(5, passed);
  const waiting = p >= 0.52 && p < 0.66;
  const status: PilotStatus = p < 0.1 ? "ready" : waiting ? "waiting" : p >= 0.9 ? "done" : "running";
  const marks: PilotMarks = {
    plane: at(plane.at),
    fixes: FLIGHT_FIXES.map((f) => at(flightPointAt(f))),
    tower: at(FLIGHT_CONTROL[0]),
    airport: at(FLIGHT_AIRPORT),
    zone: at(FLIGHT_ZONE_CENTER),
    sources: at(FLIGHT_CONTROL[1]),
    people: at(FLIGHT_CONTROL[3]),
    bubble: at(FLIGHT_CONTROL[7]),
    holdLabel: at({ x: FLIGHT_HOLD.center.x, y: FLIGHT_HOLD.center.y - 50 }),
  };
  const press = fade(p, 0.64, 0.66, 0.66, 0.68);
  return {
    cam,
    plane: planeTransform(cam),
    marks,
    heading: planeHeading(cam, plane),
    /** Lo recorrido de la aerovía (estela y ruta). */
    done: plane.f,
    lit,
    /** Índice del paso en la pantalla de ruta (0–5); `next` es el siguiente o el destino. */
    step,
    next: p >= 0.88 || step >= 5 ? null : step + 1,
    status,
    /** 'log' bitácora, 'lot' el lote, 'sent' los canales. */
    phase: p < 0.5 ? ("log" as const) : p < 0.68 ? ("lot" as const) : ("sent" as const),
    board: PILOT_BOARD.map((t) => boardRow(p, t)),
    /** La cuenta omitida se apaga en el tablero al aprobar. */
    skippedDim: p >= 0.66,
    found: Math.round(run.found * easeOut(seg(p, 0.12, 0.3))),
    qualified: Math.round(run.qualified * easeOut(seg(p, 0.3, 0.42))),
    contacted: Math.round(run.approved * easeOut(seg(p, 0.68, 0.76))),
    /** Los canales encendidos (Correo, Llamada del agente, SMS), uno cada 0,03. */
    channels: [0.7, 0.73, 0.76].filter((t) => p >= t).length,
    /** Las líneas de la bitácora, cada una con su opacidad. */
    log: [0.12, 0.24, 0.36, 0.46].map((t) => easeOut(seg(p, t, t + 0.04))),
    /** El botón «Aprobar N y contactar» se hunde. */
    pressScale: 1 - 0.06 * press,
    /** El barrido del radar de la torre (grados). */
    sweep: (p * 900) % 360,
    airportLit: p >= 0.88,
    /** Opacidades. */
    head: easeOut(seg(p, 0, 0.08)) * (1 - 0.85 * easeOut(seg(p, 0.88, 0.92))),
    panel: easeOut(seg(p, 0.04, 0.12)),
    fixesIn: easeOut(seg(p, 0.06, 0.16)),
    planeIn: easeOut(seg(p, 0.08, 0.12)),
    blip: fade(p, 0.04, 0.08, 0.2, 0.3),
    sourcesIn: fade(p, 0.2, 0.24, 0.32, 0.36),
    people: fade(p, 0.3, 0.34, 0.44, 0.48),
    zone: 0.6 + 0.4 * fade(p, 0.4, 0.44, 0.52, 0.58),
    zoneNear: 0.35 + 0.65 * fade(p, 0.4, 0.44, 0.48, 0.52),
    zonePassed: 0.3 + 0.7 * easeOut(seg(p, 0.48, 0.52)),
    hold: fade(p, 0.5, 0.53, 0.66, 0.7),
    holdLabel: fade(p, 0.52, 0.55, 0.64, 0.67),
    bubble: fade(p, 0.72, 0.76, 0.84, 0.88),
    airportLabel: 0.45 + 0.55 * easeOut(seg(p, 0.84, 0.9)),
    results: easeOut(seg(p, 0.9, 0.95)),
    funnel: easeOut(seg(p, 0.92, 0.98)),
    tune: easeOut(seg(p, 0.95, 0.99)),
  };
}

export type PilotFrame = ReturnType<typeof pilotFrame>;
