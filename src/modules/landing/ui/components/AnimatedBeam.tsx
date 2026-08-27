"use client";

import { useEffect, useId, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";

/**
 * Haz de luz que recorre una curva entre dos nodos (patrón magicui
 * "animated-beam", traído a la marca): la traza base es un `border` sutil y el
 * pulso viaja con el gradiente corto coral (tokens, sin hex). El path se mide
 * del DOM (ResizeObserver) — responsive sin re-render por scroll.
 *
 * Determinismo: sin `Math.random()` (la plantilla original sorteaba la
 * duración); el escalonado entre haces se pasa por `delay`.
 *
 * Con `prefers-reduced-motion` queda solo la traza estática: la conexión se
 * sigue leyendo, sin pulso.
 */
export function AnimatedBeam({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  duration = 5,
  delay = 0,
  pathWidth = 1.5,
}: {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  /** Curvatura vertical del arco (px; negativo curva hacia arriba). */
  curvature?: number;
  /** Segundos por recorrido del pulso. */
  duration?: number;
  /** Retardo inicial, para escalonar haces hermanos. */
  delay?: number;
  pathWidth?: number;
}) {
  const id = useId();
  const reduced = useReducedMotion();
  const [pathD, setPathD] = useState("");
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updatePath = () => {
      const from = fromRef.current;
      const to = toRef.current;
      if (!container || !from || !to) return;

      const containerRect = container.getBoundingClientRect();
      const rectA = from.getBoundingClientRect();
      const rectB = to.getBoundingClientRect();

      setSize({ width: containerRect.width, height: containerRect.height });

      const startX = rectA.left - containerRect.left + rectA.width / 2;
      const startY = rectA.top - containerRect.top + rectA.height / 2;
      const endX = rectB.left - containerRect.left + rectB.width / 2;
      const endY = rectB.top - containerRect.top + rectB.height / 2;

      const controlY = startY - curvature;
      setPathD(`M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`);
    };

    const observer = new ResizeObserver(updatePath);
    observer.observe(container);
    updatePath();
    return () => observer.disconnect();
  }, [containerRef, fromRef, toRef, curvature]);

  return (
    <svg
      fill="none"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      className={cn("pointer-events-none absolute top-0 left-0 transform-gpu", className)}
      aria-hidden
    >
      <path
        d={pathD}
        stroke="var(--color-border)"
        strokeWidth={pathWidth}
        strokeLinecap="round"
      />
      {reduced ? null : (
        <>
          <path
            d={pathD}
            stroke={`url(#${id})`}
            strokeWidth={pathWidth}
            strokeLinecap="round"
          />
          <defs>
            <motion.linearGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
              animate={{ x1: ["10%", "110%"], x2: ["0%", "100%"], y1: ["0%", "0%"], y2: ["0%", "0%"] }}
              transition={{ delay, duration, ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
            >
              <stop stopColor="var(--axi-brand)" stopOpacity="0" />
              <stop stopColor="var(--axi-brand)" />
              <stop offset="32.5%" stopColor="var(--axi-brand-2)" />
              <stop offset="100%" stopColor="var(--axi-brand-2)" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </>
      )}
    </svg>
  );
}
