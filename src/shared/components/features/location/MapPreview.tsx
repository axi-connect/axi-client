"use client";

import { useRef, useState } from "react";
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
/** 3×3 teselas: suficiente contexto sin pedirle nueve imágenes a un donante. */
const GRID = 3;

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
  const [expanded, setExpanded] = useState(false);

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
  const tiles = tilesAround(lat, lng, zoom);

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
        animate={{ height: expanded ? 260 : 148 }}
        transition={
          reduced === true
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 35 }
        }
      >
        {/* Las teselas, centradas en el punto. `-z-10` para que el contenido
            de abajo no compita con ellas. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10"
          style={{
            width: TILE_PX * GRID,
            height: TILE_PX * GRID,
            transform: `translate(calc(-50% - ${String(tiles.offset_x)}px), calc(-50% - ${String(tiles.offset_y)}px))`,
          }}
        >
          {tiles.grid.map((tile) => (
            /* Tesela de un tercero: next/image la haría pasar por nuestro
               servidor para optimizar un PNG de 256 px que ya viene optimizado.
               eslint-disable-next-line @next/next/no-img-element */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${String(tile.x)}-${String(tile.y)}`}
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

function tilesAround(lat: number, lng: number, zoom: number) {
  const center = tileFor(lat, lng, zoom);
  const half = Math.floor(GRID / 2);
  const max = 2 ** zoom;
  const grid: { x: number; y: number; left: number; top: number }[] = [];

  for (let row = -half; row <= half; row += 1) {
    for (let col = -half; col <= half; col += 1) {
      const x = center.x + col;
      const y = center.y + row;
      // Fuera del planeta no hay tesela que pedir.
      if (y < 0 || y >= max) continue;
      grid.push({
        // La longitud sí da la vuelta al mundo.
        x: ((x % max) + max) % max,
        y,
        left: (col + half) * TILE_PX,
        top: (row + half) * TILE_PX,
      });
    }
  }

  // Cuánto hay que correr la rejilla para que el punto quede en el centro.
  return {
    grid,
    offset_x: (center.fraction_x - 0.5) * TILE_PX,
    offset_y: (center.fraction_y - 0.5) * TILE_PX,
  };
}

function formatRadius(meters: number): string {
  return meters >= 1_000
    ? `${(meters / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} km a la redonda`
    : `${String(meters)} m a la redonda`;
}
