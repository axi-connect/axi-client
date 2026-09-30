/**
 * Por dónde pasa el hilo de luz de la película. SOLO datos: cambiar el recorrido
 * es editar este archivo; apagar el hilo es `enabled: false`; quitarlo del todo es
 * borrar este archivo, `thread-geometry.ts` y `ui/film/thread/` y la llamada en el
 * motor (ver `ui/film/thread/thread.ts`).
 *
 * Cada escena se identifica por su `data-scene`. Los puntos van en % de la caja
 * de la escena, de arriba abajo. Una escena que no está en la página se ignora.
 *
 * Reglas del recorrido (render del 2026-09-30):
 * - El hilo pasa por los márgenes y por detrás del protagonista, nunca por
 *   encima de un titular.
 * - Una escena no declara `y = 0` si la anterior sale por `y = 100`: dos anclas
 *   casi juntas hacen un rizo en la curva.
 * - `brand` > 0 solo en los momentos de marca (apertura, meta y cierre). El resto
 *   es tinta: el haz se ve blanco.
 * - `ignite` enciende la escena cuando la luz llega (`data-thread-lit` en la
 *   sección; el protagonista lleva `data-thread-target`).
 */
import { MAP_HEIGHT, MAP_WIDTH, roadPointAt } from "./route-map";
import { ROUTE_FRACTIONS } from "./route-scenario";
import type { SceneBox, ThreadPath, ThreadPoint } from "./thread-geometry";

const p = (x: number, y: number, brand = 0, ignite = false): ThreadPoint => ({ x, y, brand, ignite });
/** Un punto cuyo momento fija la línea de tiempo de la escena (solo cuenta si se fija). */
const at = (pin: number, x: number, y: number, brand = 0, ignite = false): ThreadPoint => ({ ...p(x, y, brand, ignite), pin });

/**
 * La carretera se dibuja en la línea de tiempo de `goal` (motor, `film-engine.ts`):
 * de 0,2 a 2,4 sobre 4,9 de duración, con `power1.inOut`. Si esa coreografía cambia,
 * se cambia aquí. Sin esto, los puntos (que suben por la pantalla) caían todos en el
 * mismo instante y la luz recorría la carretera de golpe.
 */
const GOAL_ROAD = { start: 0.2 / 4.9, span: 2.2 / 4.9 };
/** Inversa de `power1.inOut` (cuadrática): en qué tiempo alcanza el trazo la fracción `q`. */
const inOutQuadInverse = (q: number) => (q < 0.5 ? Math.sqrt(q / 2) : 1 - Math.sqrt((1 - q) / 2));

/**
 * En la meta, el hilo ES la carretera: recorre `route-map` hasta «vas aquí» (63 %).
 * El mapa se pinta como «cover» de 16:10 con ancho `max(100 %, 160svh)` y centrado
 * (escena `goal`, escritorio); los puntos se llevan a % de la escena con esa misma
 * regla, así el haz cae sobre la carretera en cualquier ventana. Con la escena fijada,
 * cada punto llega cuando el trazo de la carretera pasa por él (`GOAL_ROAD`).
 */
function goalRoad({ width, height, viewportHeight }: SceneBox): ThreadPoint[] {
  const mapW = Math.max(width, 1.6 * viewportHeight);
  const mapH = (mapW * MAP_HEIGHT) / MAP_WIDTH;
  const left = (width - mapW) / 2;
  const top = (height - mapH) / 2;
  const steps = [0, 0.12, 0.24, 0.36, 0.48, ROUTE_FRACTIONS.done];
  return steps.map((f, i) => {
    const r = roadPointAt(f);
    const x = ((left + (r.x / MAP_WIDTH) * mapW) / width) * 100;
    const y = ((top + (r.y / MAP_HEIGHT) * mapH) / height) * 100;
    const pin = GOAL_ROAD.start + GOAL_ROAD.span * inOutQuadInverse(f / ROUTE_FRACTIONS.done);
    return { ...p(x, y, 0.4 + (0.6 * i) / (steps.length - 1), i === steps.length - 1), pin };
  });
}

export const FILM_THREAD: ThreadPath = {
  enabled: true,

  desktop: [
    // El haz nace bajo el CTA («Sin tarjeta…» termina hacia el 71 % del alto a 900 px),
    // encima del gradiente vivo, y baja por el hueco central entre las cifras 2 y 3
    // (rejilla de 4 columnas centrada). El hero ya no tiene dunas (e34d5636).
    { scene: "hero", points: [p(50, 75, 1), p(50, 90, 1), p(56, 100, 0.8)] },
    { scene: "niche", points: [p(94, 24), p(72, 70, 0, true), p(50, 100)] },
    { scene: "radar", points: [p(90, 22), p(70, 52, 0, true), p(94, 96)] },
    { scene: "followup", points: [p(96, 40), p(80, 97, 0, true), p(30, 100)] },
    { scene: "chat", points: [p(6, 34), p(16, 88, 0, true), p(50, 100)] },
    { scene: "photo", points: [p(5, 40), p(6, 86, 0, true), p(40, 100)] },
    { scene: "call", points: [p(94, 30), p(94, 82, 0, true), p(60, 100)] },
    { scene: "vault", points: [p(30, 24), p(50, 62, 0.2, true), p(70, 100)] },
    { scene: "team", points: [p(94, 30), p(92, 84, 0, true), p(50, 100)] },
    // Escenas rediseñadas (lienzo aprobado el 2026-09-30): cobrar pasa por detrás
    // del recibo y lo enciende al salir por su esquina; ordenar baja por el margen
    // y enciende la tarjeta que aterriza en «Compromiso», y sale por debajo de la
    // mesa hacia el arranque de la carretera (abajo a la izquierda).
    { scene: "collect", points: [p(53, 23), p(61, 62), p(90, 88, 0, true), p(95, 100)] },
    { scene: "pipeline", points: [p(97, 21), p(96, 52), p(87, 77, 0, true), p(50, 95), p(8, 100, 0.2)] },
    { scene: "goal", resolve: goalRoad },
    // Axel: el hilo se tiende de lado a lado y ES el horizonte. Medir: se abre en
    // fibras que convergen en lo producido. Los tramos horizontales llevan su
    // momento (`at`) para no cruzarse de golpe cuando la escena se fija.
    { scene: "axel", points: [p(95, 22, 0.3), p(92, 53), at(0.45, 50, 56, 0, true), at(0.75, 8, 59), p(5, 100)] },
    { scene: "measure", points: [p(4, 28), p(7, 62, 0, true), at(0.15, 21, 69), at(0.8, 82, 70, 0.3), at(0.9, 90, 86, 0.3), p(95, 100, 0.3)] },
    { scene: "pricing", points: [p(97, 50, 0.2)] },
    { scene: "faq", points: [p(97, 50, 0.4)] },
    { scene: "close", points: [p(80, 20, 1), p(50, 42, 1, true)] },
  ],

  // En móvil el texto ocupa todo el ancho: el hilo va por los márgenes y cruza
  // entre escenas. Sin carretera: el mapa es una ventana propia (escena `goal`).
  mobile: [
    // En móvil el texto y las cifras (2 × 2) llenan el hero: el haz nace en su borde
    // inferior, por el hueco central de las cifras, y entra al nicho.
    { scene: "hero", points: [p(50, 97, 1), p(60, 100, 0.8)] },
    { scene: "niche", points: [p(5, 50, 0, true), p(20, 100)] },
    { scene: "radar", points: [p(95, 50, 0, true)] },
    { scene: "followup", points: [p(5, 50, 0, true)] },
    { scene: "chat", points: [p(95, 50, 0, true)] },
    { scene: "photo", points: [p(5, 50, 0, true)] },
    { scene: "call", points: [p(95, 50, 0, true)] },
    { scene: "vault", points: [p(5, 50, 0.2, true)] },
    { scene: "team", points: [p(95, 50, 0, true)] },
    { scene: "collect", points: [p(6, 40), p(6, 90, 0, true), p(50, 99)] },
    { scene: "pipeline", points: [p(94, 6), p(94, 60, 0.3, true), p(94, 97)] },
    { scene: "goal", points: [p(5, 40, 0.8), p(50, 96, 1, true)] },
    { scene: "axel", points: [p(94, 6, 0.3), p(94, 40), p(50, 57, 0, true), p(6, 61), p(6, 97)] },
    { scene: "measure", points: [p(6, 40), p(9, 53, 0, true), p(91, 54, 0.3), p(95, 97, 0.3)] },
    { scene: "pricing", points: [p(96, 50, 0.2)] },
    { scene: "faq", points: [p(96, 50, 0.4)] },
    { scene: "close", points: [p(80, 20, 1), p(50, 40, 1, true)] },
  ],
};
