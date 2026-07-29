"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { useScrollContainer } from "@/modules/landing/ui/components/use-scroll-container";

/**
 * Parallax sutil ligado al scroll del contenedor de la landing: el contenido
 * se desplaza contra la dirección del scroll según `strength` (equivalente a
 * `data-parallax` de la plantilla). Solo `transform` (compositor).
 *
 * El inner que llama a `useScroll` se monta SOLO cuando el contenedor de
 * scroll ya está resuelto: framer-motion lanza "Container ref is defined but
 * not hydrated" si recibe una ref todavía nula.
 */
export function ParallaxLayer({
  strength = 0.1,
  className,
  children,
}: {
  /** Factor de desplazamiento (0.1 ≈ ±10px por viewport recorrido). */
  strength?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const { containerRef, ready } = useScrollContainer();

  if (reduced || !ready) {
    return <div className={className}>{children}</div>;
  }
  return (
    <ParallaxInner strength={strength} className={className} containerRef={containerRef}>
      {children}
    </ParallaxInner>
  );
}

function ParallaxInner({
  strength,
  className,
  containerRef,
  children,
}: {
  strength: number;
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    container: containerRef as RefObject<HTMLElement>,
    offset: ["start end", "end start"],
    layoutEffect: false,
  });
  const y = useTransform(scrollYProgress, [0, 1], [strength * 100, -strength * 100]);

  return (
    <motion.div ref={targetRef} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
