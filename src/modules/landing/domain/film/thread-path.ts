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

/**
 * En la meta, el hilo ES la carretera: recorre `route-map` hasta «vas aquí» (63 %).
 * El mapa se pinta como «cover» de 16:10 con ancho `max(100 %, 160svh)` y centrado
 * (escena `goal`, escritorio); los puntos se llevan a % de la escena con esa misma
 * regla, así el haz cae sobre la carretera en cualquier ventana.
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
    return p(x, y, 0.4 + (0.6 * i) / (steps.length - 1), i === steps.length - 1);
  });
}

export const FILM_THREAD: ThreadPath = {
  enabled: true,

  desktop: [
    // El haz nace en las crestas de las dunas (HeroSky, en x = 50 %: violeta ~64 %,
    // ámbar ~75 % y coral ~85 % del alto) y baja por el hueco central de las cifras.
    { scene: "hero", points: [p(50, 70, 1), p(50, 86, 1), p(56, 100, 0.8)] },
    { scene: "niche", points: [p(94, 24), p(72, 70, 0, true), p(50, 100)] },
    { scene: "radar", points: [p(90, 22), p(70, 52, 0, true), p(94, 96)] },
    { scene: "followup", points: [p(96, 40), p(80, 97, 0, true), p(30, 100)] },
    { scene: "chat", points: [p(6, 34), p(16, 88, 0, true), p(50, 100)] },
    { scene: "photo", points: [p(5, 40), p(6, 86, 0, true), p(40, 100)] },
    { scene: "call", points: [p(94, 30), p(94, 82, 0, true), p(60, 100)] },
    { scene: "vault", points: [p(30, 24), p(50, 62, 0.2, true), p(70, 100)] },
    { scene: "team", points: [p(94, 30), p(92, 84, 0, true), p(50, 100)] },
    { scene: "collect", points: [p(5, 40), p(6, 88, 0, true), p(40, 100)] },
    { scene: "pipeline", points: [p(94, 30), p(80, 94, 0, true), p(20, 100, 0.2)] },
    { scene: "goal", resolve: goalRoad },
    { scene: "axel", points: [p(94, 30, 0.4), p(94, 84, 0, true), p(50, 100)] },
    { scene: "measure", points: [p(5, 36), p(6, 86, 0, true), p(50, 100, 0.3)] },
    { scene: "pricing", points: [p(97, 50, 0.2)] },
    { scene: "faq", points: [p(97, 50, 0.4)] },
    { scene: "close", points: [p(80, 20, 1), p(50, 42, 1, true)] },
  ],

  // En móvil el texto ocupa todo el ancho: el hilo va por los márgenes y cruza
  // entre escenas. Sin carretera: el mapa es una ventana propia (escena `goal`).
  mobile: [
    { scene: "hero", points: [p(50, 70, 1), p(50, 86, 1), p(60, 100, 0.8)] },
    { scene: "niche", points: [p(5, 50, 0, true), p(20, 100)] },
    { scene: "radar", points: [p(95, 50, 0, true)] },
    { scene: "followup", points: [p(5, 50, 0, true)] },
    { scene: "chat", points: [p(95, 50, 0, true)] },
    { scene: "photo", points: [p(5, 50, 0, true)] },
    { scene: "call", points: [p(95, 50, 0, true)] },
    { scene: "vault", points: [p(5, 50, 0.2, true)] },
    { scene: "team", points: [p(95, 50, 0, true)] },
    { scene: "collect", points: [p(5, 50, 0, true)] },
    { scene: "pipeline", points: [p(95, 50, 0.3, true)] },
    { scene: "goal", points: [p(5, 40, 0.8), p(50, 96, 1, true)] },
    { scene: "axel", points: [p(95, 50, 0.3, true)] },
    { scene: "measure", points: [p(5, 50, 0, true)] },
    { scene: "pricing", points: [p(96, 50, 0.2)] },
    { scene: "faq", points: [p(96, 50, 0.4)] },
    { scene: "close", points: [p(80, 20, 1), p(50, 40, 1, true)] },
  ],
};
