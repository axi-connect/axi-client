"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { useScrollContainer } from "@/modules/landing/ui/components/use-scroll-container";

/**
 * Tablet 3D que se endereza con el scroll (rotateY 10° → 0° + scale
 * 0.96 → 1) — el hermano lateral de `LaptopMockup`, mismo patrón declarativo
 * (`useScroll` sobre el contenedor `[data-app-scroll]`, inner montado solo
 * cuando la ref está hidratada). Con reduced-motion queda plana y estática.
 */
export function TabletFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { containerRef, ready } = useScrollContainer();

  if (reduced || !ready) {
    return (
      <div className={cn("mx-auto w-full max-w-[560px]", className)}>
        <TabletBody>{children}</TabletBody>
      </div>
    );
  }
  return (
    <TabletAnimated className={className} containerRef={containerRef}>
      {children}
    </TabletAnimated>
  );
}

function TabletBody({ children }: { children: ReactNode }) {
  return (
    <div className="border-border bg-card relative rounded-[30px] border p-3 shadow-overlay">
      {/* Botón lateral del bisel. */}
      <span
        aria-hidden
        className="bg-border absolute top-1/2 -left-px h-11 w-[3px] -translate-y-1/2 rounded-full"
      />
      <div className="border-border bg-background overflow-hidden rounded-[20px] border">
        {children}
      </div>
    </div>
  );
}

function TabletAnimated({
  className,
  containerRef,
  children,
}: {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    container: containerRef as RefObject<HTMLElement>,
    offset: ["start 0.92", "start 0.4"],
    layoutEffect: false,
  });
  const rotateY = useTransform(scrollYProgress, [0, 1], [10, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);

  return (
    <div
      ref={wrapRef}
      className={cn("mx-auto w-full max-w-[560px]", className)}
      style={{ perspective: 1400 }}
    >
      <motion.div style={{ rotateY, scale, transformOrigin: "center" }}>
        <TabletBody>{children}</TabletBody>
      </motion.div>
    </div>
  );
}
