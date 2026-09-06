"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { flowStage, spring } from "@/core/styles/motion";
import { useStaggeredCount } from "@/modules/onboarding/ui/flow/use-staggered-count";

export type FlowStopStatus = "pending" | "done" | "skipped";

export type FlowStop = {
  code: string;
  label: string;
  icon: LucideIcon;
  /**
   * Estado de la parada cuando el progreso lo conoce (onboarding). Sin él, la
   * ruta deduce «recorrida» por posición (registro): todo lo anterior a la
   * activa se puede volver a visitar.
   */
  status?: FlowStopStatus;
};

/**
 * Alto fijo del recorrido; la curva se dibuja en proporción a él. La amplitud
 * es corta a propósito: la parada activa mide 128 px más un anillo de 10, y
 * tiene que caber entera —con su etiqueta debajo— tanto en un punto alto como
 * en uno bajo de la curva. Con amplitud grande el anillo se recortaba arriba.
 */
const HEIGHT = 280;
const HEIGHT_SM = 210;
const FALLBACK_WIDTH = 1024;
const SHORT_VIEWPORT = "(max-height: 760px)";

/**
 * La ruta «Flow» (mockup v3, 2026-09-05): una curva suave al pie de la pantalla
 * con una parada por paso. La parada activa se agranda y queda siempre
 * centrada; al avanzar, la curva entera se desliza con un spring y la
 * siguiente parada llega al centro. Las paradas cerradas (recorridas, hechas u
 * omitidas) se pueden pulsar para volver: adelante solo con información, atrás
 * siempre. Una parada omitida lleva el borde discontinuo: es honesto decir que
 * quedó «para después».
 *
 * Geometría: paradas equidistantes (`seg`) alternando alto y bajo, unidas por
 * cúbicas con tangentes horizontales, así la curva pasa plana por cada parada y
 * el nodo se posa sobre ella. Se añade una parada virtual a cada lado para que
 * el trazo entre y salga de la pantalla en vez de nacer en el primer nodo.
 *
 * Con `celebrate` (pantalla «Listo») las paradas hechas se encienden una tras
 * otra en el color de «completado» del alcance (violeta sobre el suelo, cristal
 * encendido sobre el campo); con reduced-motion aparecen todas encendidas.
 *
 * Es `nav` y no decoración: los nodos cerrados son botones con nombre. Solo el
 * trazo SVG va `aria-hidden`. El mismo componente sirve al campo coral y al
 * suelo del panel porque solo habla el vocabulario `--sf-*` (globals.css).
 */
export function FlowRoute({
  stops,
  current,
  onJump,
  ariaLabel,
  celebrate = false,
  className,
}: {
  stops: readonly FlowStop[];
  current: number;
  onJump: (index: number) => void;
  ariaLabel: string;
  celebrate?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [short, setShort] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const lit = useStaggeredCount(celebrate ? stops.length : 0, flowStage.lightEvery * 1000, reduced);

  // Pantalla baja (portátil pequeño, móvil apaisado): la ruta cede alto a la
  // pregunta. Se decide por viewport, no por contenedor, porque lo que falta
  // es altura de ventana.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(SHORT_VIEWPORT);
    const apply = () => setShort(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Primera medida síncrona (sin layout, como en jsdom, cae al ancho de
    // respaldo para que las paradas existan); después, el observer manda.
    setWidth(el.clientWidth || FALLBACK_WIDTH);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const compact = (width > 0 && width < 640) || short;
  const height = compact ? HEIGHT_SM : HEIGHT;
  const seg = Math.max(240, Math.min(560, width * 0.42));
  const amp = height * 0.09;
  const base = height * 0.47;
  const count = stops.length;
  // Índices -1..count: las dos paradas virtuales de los extremos.
  const points = Array.from({ length: count + 2 }, (_, k) => {
    const i = k - 1;
    return [seg * (i + 1), base + (i % 2 === 0 ? amp : -amp)] as const;
  });
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    d += ` C ${x0 + seg / 2} ${y0}, ${x1 - seg / 2} ${y1}, ${x1} ${y1}`;
  }
  const total = seg * (count + 1);
  const x = width / 2 - points[current + 1][0];

  return (
    <nav ref={ref} aria-label={ariaLabel} className={cn("relative mt-2 w-full shrink-0 overflow-hidden", className)} style={{ height }}>
      {width > 0 ? (
        <motion.div
          className="absolute top-0 left-0 h-full will-change-transform"
          style={{ width: total }}
          initial={false}
          animate={{ x }}
          transition={reduced ? { duration: 0 } : spring.soft}
        >
          <svg aria-hidden="true" className="absolute top-0 left-0 overflow-visible" width={total} height={height} viewBox={`0 0 ${total} ${height}`}>
            <path className="flow-route-path" d={d} />
          </svg>
          {stops.map((stop, index) => {
            const [px, py] = points[index + 1];
            const distance = Math.abs(index - current);
            const active = index === current;
            const closed = stop.status ? stop.status !== "pending" : index < current;
            const done = stop.status === "done";
            const skipped = stop.status === "skipped";
            const isLit = celebrate && index < lit && (done || active);
            const Icon = stop.icon;
            const size = active ? (compact ? 96 : 128) : distance === 1 ? (compact ? 52 : 72) : compact ? 44 : 60;
            const shared = cn(
              "sf-glass absolute grid place-items-center rounded-full text-foreground transition-[width,height,opacity,background-color,border-color,box-shadow,color] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
              active && "sf-glass-on border-2 shadow-[0_0_0_10px_var(--sf-glass),0_24px_60px_rgb(0_0_0/.14)]",
              distance > 1 && "opacity-55",
              closed && !active && "sf-glass-hover cursor-pointer",
              skipped && "flow-stop--skipped",
              isLit && "flow-stop--lit",
            );
            const style = { left: px, top: py, width: size, height: size, transform: "translate(-50%,-50%)" };
            const content = (
              <>
                <Icon aria-hidden="true" className={cn("transition-[width,height] duration-500", active ? "size-11 sm:size-11" : "size-5 sm:size-6")} strokeWidth={1.8} />
                {done && !active && !isLit ? (
                  <span aria-hidden="true" className="flow-stop-badge absolute -top-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                ) : null}
                <span
                  className={cn(
                    "text-muted-foreground absolute top-[calc(100%+10px)] text-xs font-semibold tracking-[.06em] uppercase whitespace-nowrap transition-opacity duration-400",
                    active ? "opacity-100" : "opacity-0",
                  )}
                >
                  {stop.label}
                </span>
              </>
            );
            return closed && !active ? (
              <button
                key={stop.code}
                type="button"
                onClick={() => onJump(index)}
                aria-label={`Volver a ${stop.label}${skipped ? " (para después)" : ""}`}
                className={shared}
                style={style}
              >
                {content}
              </button>
            ) : (
              <span key={stop.code} aria-current={active ? "step" : undefined} aria-label={stop.label} className={shared} style={style}>
                {content}
              </span>
            );
          })}
        </motion.div>
      ) : null}
    </nav>
  );
}
