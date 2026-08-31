"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Maximize2 } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * De dónde salen las teselas. Se recibe por prop porque la política de uso de
 * OpenStreetMap permite tráfico ligero y nada más: el día que esto escale, se
 * cambia por un proveedor con llave sin tocar el componente.
 */
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "© Colaboradores de OpenStreetMap";

const TILE_PX = 256;

/**
 * El alto del visor, plegado y expandido.
 *
 * Son constantes y no una medida, y de eso depende el mosaico: el alto lo anima
 * un resorte, así que medirlo recalcularía la rejilla en cada fotograma y
 * pediría teselas a mitad de la transición. El ancho sí se mide, porque es
 * fluido y nadie lo anima.
 */
const COLLAPSED_H = 148;
const EXPANDED_H = 260;

export interface MapPreviewProps {
  lat: number;
  lng: number;
  /** Lo que se lee sobre el mapa. */
  label: string;
  /** Círculo del área que se va a buscar. */
  radiusM?: number | null;
  tileUrl?: string;
  attribution?: string;
  className?: string;
}

/**
 * Un mapa de verdad del sitio elegido, con el área de búsqueda encima.
 *
 * Teselas reales y no un dibujo decorativo porque la decisión que se está
 * tomando encima de este mapa es **si el radio alcanza**, y eso no se puede
 * juzgar sobre calles inventadas.
 *
 * Sin librería de mapas: se calculan las coordenadas de tesela y se pintan como
 * imágenes. Traer Leaflet o Mapbox para enseñar un punto quieto serían ~150 KB
 * y un sistema de eventos que aquí nadie usa.
 *
 * La atribución NO es adorno: la ODbL permite el uso comercial citando la
 * fuente, así que la cita es la condición bajo la que ese mapa se puede usar.
 */
export function MapPreview({
  lat,
  lng,
  label,
  radiusM,
  tileUrl = OSM_TILES,
  attribution = OSM_ATTRIBUTION,
  className,
}: MapPreviewProps) {
  const reduced = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  /**
   * El ancho del visor. **De él sale cuántas teselas hacen falta**, así que
   * mientras no se sepa no se pide ninguna: pintar con la rejilla equivocada es
   * una tanda de peticiones tiradas.
   *
   * Se mide en `useLayoutEffect`, o sea antes de que el navegador pinte, para
   * que el primer fotograma ya salga completo.
   */
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = viewport.current;
    if (node === null) return;
    setWidth(node.offsetWidth);
    // En jsdom no existe, y sin él la medida inicial ya basta.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltX = useSpring(useTransform(pointerY, [-60, 60], [6, -6]), {
    stiffness: 300,
    damping: 30,
  });
  const tiltY = useSpring(useTransform(pointerX, [-60, 60], [-6, 6]), {
    stiffness: 300,
    damping: 30,
  });

  const zoom = zoomFor(radiusM ?? null, expanded);
  const mosaic = tileMosaic({
    lat,
    lng,
    zoom,
    width,
    height: expanded ? EXPANDED_H : COLLAPSED_H,
  });

  function onPointerMove(event: React.PointerEvent) {
    if (reduced === true || container.current === null) return;
    const box = container.current.getBoundingClientRect();
    pointerX.set(event.clientX - (box.left + box.width / 2));
    pointerY.set(event.clientY - (box.top + box.height / 2));
  }

  return (
    <motion.div
      ref={container}
      className={cn("relative select-none", className)}
      style={{ perspective: 1000 }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      <motion.button
        ref={viewport}
        type="button"
        aria-expanded={expanded}
        aria-label={`${label}. ${expanded ? "Reducir" : "Ampliar"} el mapa`}
        onClick={() => setExpanded((current) => !current)}
        className="border-border bg-muted focus-visible:ring-ring relative block w-full overflow-hidden rounded-xl border focus-visible:ring-2 focus-visible:outline-none"
        style={
          reduced === true
            ? undefined
            : { rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }
        }
        animate={{ height: expanded ? EXPANDED_H : COLLAPSED_H }}
        transition={
          reduced === true
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 35 }
        }
      >
        {/* Las teselas. El envoltorio es un ANCLA de tamaño cero en el centro
            del visor: cada tesela ya trae su posición respecto a ese centro, así
            que no hay un tamaño de mosaico que pueda quedarse corto — que es
            exactamente lo que dejaba una franja vacía al lado. `-z-10` para que
            el contenido de abajo no compita con ellas. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10"
        >
          {mosaic.tiles.map((tile) => (
            /* Tesela de un tercero: next/image la haría pasar por nuestro
               servidor para optimizar un PNG de 256 px que ya viene optimizado.
               eslint-disable-next-line @next/next/no-img-element */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              /* Por POSICIÓN y no por coordenada de tesela: a zoom bajo un
                 visor ancho puede dar la vuelta al mundo y repetir la misma
                 tesela, y dos claves iguales rompen la lista. */
              key={`${String(tile.left)}-${String(tile.top)}`}
              src={tileUrl
                .replace("{z}", String(zoom))
                .replace("{x}", String(tile.x))
                .replace("{y}", String(tile.y))}
              alt=""
              width={TILE_PX}
              height={TILE_PX}
              loading="lazy"
              className="absolute"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
        </span>

        {/* El área que se va a buscar. Es la razón de que el mapa sea real. */}
        {radiusM !== null && radiusM !== undefined && (
          <span
            aria-hidden="true"
            className="border-accent bg-accent/15 pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              width: radiusPx(radiusM, lat, zoom) * 2,
              height: radiusPx(radiusM, lat, zoom) * 2,
            }}
          />
        )}

        {/* El pin. Va sobre el círculo para que se vea el centro exacto. */}
        <span
          aria-hidden="true"
          className="bg-accent ring-background absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
        />

        <span className="from-background/95 pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-3 pt-8 text-left">
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="text-muted-foreground block font-mono text-[11px] tabular-nums">
            {lat.toFixed(4)}, {lng.toFixed(4)}
            {radiusM !== null && radiusM !== undefined && ` · ${formatRadius(radiusM)}`}
          </span>
        </span>

        <span className="bg-background/70 text-muted-foreground absolute top-2 right-2 grid size-6 place-items-center rounded-md">
          <Maximize2 aria-hidden="true" className="size-3" />
        </span>
      </motion.button>

      <p className="text-muted-foreground mt-1 text-[11px]">{attribution}</p>
    </motion.div>
  );
}

/**
 * Qué zoom encuadra el radio pedido.
 *
 * Se elige por el radio y no por un valor fijo: con 500 m un zoom de ciudad
 * enseñaría un punto perdido, y con 30 km uno de barrio no dejaría ver el
 * círculo entero — que es justo lo que se viene a mirar.
 */
export function zoomFor(radiusM: number | null, expanded: boolean): number {
  const base =
    radiusM === null ? 14 : radiusM <= 1_000 ? 15 : radiusM <= 3_000 ? 14 : radiusM <= 10_000 ? 12 : 10;
  return expanded ? base : base - 1;
}

/** Metros por píxel en la proyección de Mercator, corregidos por latitud. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156_543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

function radiusPx(radiusM: number, lat: number, zoom: number): number {
  return radiusM / metersPerPixel(lat, zoom);
}

/** La tesela que contiene un punto, con su desplazamiento dentro de ella. */
export function tileFor(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * n;
  const y = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;
  return {
    x: Math.floor(x),
    y: Math.floor(y),
    fraction_x: x - Math.floor(x),
    fraction_y: y - Math.floor(y),
  };
}

/**
 * Qué teselas hacen falta para tapar un visor de `width`×`height`, y dónde va
 * cada una respecto al CENTRO de ese visor.
 *
 * Sustituye a una rejilla de 3×3 fija, que es el bug que el dueño vio como una
 * franja vacía al borde del mapa. La cuenta: el mosaico se corre `offset` para
 * que el punto quede centrado, y ese corrimiento llega a ±128 px, así que de los
 * 768 px de un 3×3 lo único GARANTIZADO eran `(3−1)·256 = 512 px` — menos que
 * cualquier tarjeta del panel. Con las coordenadas del informe el corrimiento
 * era de 126 px y quedaban ~68 px de tarjeta sin tesela.
 *
 * Aquí los rangos salen de la condición de que la tesela toque el visor
 * `[−W/2, W/2]`, así que cubre por construcción y para cualquier fracción. Y de
 * paso pide MENOS imágenes que antes —4 en la tarjeta plegada de la captura
 * frente a 9—, que importa porque las teselas las dona OpenStreetMap: el techo
 * es `(ceil(W/256)+1) × (ceil(H/256)+1)`.
 */
export function tileMosaic({
  lat,
  lng,
  zoom,
  width,
  height,
}: {
  lat: number;
  lng: number;
  zoom: number;
  /** Del visor. Con 0 —todavía sin medir— no se pide ninguna tesela. */
  width: number;
  height: number;
}): { tiles: { x: number; y: number; left: number; top: number }[] } {
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  if (width <= 0 || height <= 0) return { tiles };

  const center = tileFor(lat, lng, zoom);
  const max = 2 ** zoom;
  // Cuánto hay que correr el mosaico para que el punto quede en el centro.
  const offsetX = (center.fraction_x - 0.5) * TILE_PX;
  const offsetY = (center.fraction_y - 0.5) * TILE_PX;
  const half = TILE_PX / 2;

  /**
   * La tesela de columna `c` ocupa `[c·256 − 128 − offset, c·256 + 128 − offset]`
   * con el cero en el centro del visor, así que toca el visor si su intervalo
   * corta con `[−W/2, W/2]`. Despejar `c` de esas dos desigualdades da el rango.
   */
  const range = (size: number, offset: number) => ({
    from: Math.ceil((-size / 2 + offset - half) / TILE_PX),
    to: Math.floor((size / 2 + offset + half) / TILE_PX),
  });
  const cols = range(width, offsetX);
  const rows = range(height, offsetY);

  for (let row = rows.from; row <= rows.to; row += 1) {
    for (let col = cols.from; col <= cols.to; col += 1) {
      const y = center.y + row;
      // Fuera del planeta no hay tesela que pedir.
      if (y < 0 || y >= max) continue;
      tiles.push({
        // La longitud sí da la vuelta al mundo.
        x: (((center.x + col) % max) + max) % max,
        y,
        left: col * TILE_PX - half - offsetX,
        top: row * TILE_PX - half - offsetY,
      });
    }
  }

  return { tiles };
}

function formatRadius(meters: number): string {
  return meters >= 1_000
    ? `${(meters / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} km a la redonda`
    : `${String(meters)} m a la redonda`;
}
