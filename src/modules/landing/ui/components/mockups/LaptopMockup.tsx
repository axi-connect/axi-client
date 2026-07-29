"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { useScrollContainer } from "@/modules/landing/ui/components/use-scroll-container";

/**
 * Laptop 3D cuya tapa se abre con el scroll (rotateX −72° → 0° + scale
 * 0.94 → 1), revelando el dashboard del producto. Declarativo con
 * `useScroll`/`useTransform` sobre el contenedor de scroll de la landing.
 *
 * Con reduced-motion —o hasta que el contenedor de scroll esté resuelto—
 * la tapa se muestra abierta y estática (framer-motion exige que la ref del
 * container esté hidratada antes de llamar a `useScroll`).
 */
export function LaptopMockup({
  windowTitle,
  children,
  className,
}: {
  /** Texto de la barra de la "ventana" (p.ej. app.axiconnect.co / analytics). */
  windowTitle: string;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { containerRef, ready } = useScrollContainer();

  if (reduced || !ready) {
    return (
      <LaptopFrame windowTitle={windowTitle} className={className}>
        {children}
      </LaptopFrame>
    );
  }
  return (
    <LaptopFrameAnimated windowTitle={windowTitle} className={className} containerRef={containerRef}>
      {children}
    </LaptopFrameAnimated>
  );
}

/** Chrome compartido: pantalla con barra de ventana + base del laptop. */
function LaptopScreen({ windowTitle, children }: { windowTitle: string; children: ReactNode }) {
  return (
    <div className="border-border bg-background overflow-hidden rounded-[14px] border">
      <div className="border-border/70 bg-secondary/60 flex items-center gap-2 border-b px-4 py-2.5">
        <span aria-hidden className="bg-brand size-[11px] rounded-full" />
        <span aria-hidden className="bg-accent-amber size-[11px] rounded-full" />
        <span aria-hidden className="bg-success size-[11px] rounded-full" />
        <span className="text-muted-foreground flex-1 text-center font-mono text-xs">
          {windowTitle}
        </span>
        <span aria-hidden className="w-11" />
      </div>
      {children}
    </div>
  );
}

function LaptopBase() {
  return (
    <div
      aria-hidden
      className="border-border bg-secondary mx-auto h-3 w-[38%] rounded-b-2xl border border-t-0 shadow-float"
    />
  );
}

function LaptopFrame({
  windowTitle,
  className,
  children,
}: {
  windowTitle: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1060px]", className)}>
      <div className="border-border bg-card rounded-t-[22px] rounded-b-md border p-3 pb-4 shadow-overlay">
        <LaptopScreen windowTitle={windowTitle}>{children}</LaptopScreen>
      </div>
      <LaptopBase />
    </div>
  );
}

function LaptopFrameAnimated({
  windowTitle,
  className,
  containerRef,
  children,
}: {
  windowTitle: string;
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    container: containerRef as RefObject<HTMLElement>,
    /* Empieza a abrir cuando el mockup asoma y termina con él centrado. */
    offset: ["start 0.92", "start 0.35"],
    layoutEffect: false,
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [-72, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  return (
    <div
      ref={wrapRef}
      className={cn("mx-auto w-full max-w-[1060px]", className)}
      style={{ perspective: 1400 }}
    >
      <motion.div
        className="border-border bg-card rounded-t-[22px] rounded-b-md border p-3 pb-4 shadow-overlay"
        style={{ rotateX, scale, transformOrigin: "bottom center" }}
      >
        <LaptopScreen windowTitle={windowTitle}>{children}</LaptopScreen>
      </motion.div>
      <LaptopBase />
    </div>
  );
}
