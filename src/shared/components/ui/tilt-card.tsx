"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";

/**
 * Tarjeta con tilt 3D + glare radial que sigue el cursor (el "efecto cometa"
 * de la plantilla). Física por lerp en rAF — es interacción continua guiada
 * por el puntero, no una transición, por eso no usa presets de duración.
 *
 * Inerte con `prefers-reduced-motion` y en dispositivos sin puntero fino
 * (`hover: none`): queda como tarjeta estática accesible.
 *
 * Vive en `shared/` y no en un slice porque tiene consumidores en dos: las
 * secciones de la capa pública (`modules/landing`) y el tiquete del próximo
 * cobro (`modules/billing`). Un slice no puede importar del `ui/components/`
 * de otro (architecture §3.3 regla 5), y el efecto no tiene dominio: solo
 * depende de `cn`, así que `shared/` sigue sin importar de `modules/` (regla 7).
 *
 * IMPORTANTE: el wrapper debe tener el MISMO radio que la tarjeta hija
 * (default `rounded-2xl`) — el glare recorta con `rounded-[inherit]`; sin
 * radio en el wrapper, sus esquinas cuadradas asoman iluminadas por fuera
 * de la esquina redondeada de la tarjeta. Si la hija usa otro radio,
 * pasarlo por `className` (p.ej. `rounded-[26px]`).
 */
export function TiltCard({
  depth = 10,
  // Renombrado: dentro del efecto `glare` es la referencia al DOM del reflejo.
  glare: glareTone = "soft",
  scale = 1.02,
  className,
  children,
}: {
  /** Intensidad de la rotación en grados (como `data-tilt` de la plantilla). */
  depth?: number;
  /**
   * Carácter del reflejo que sigue al cursor.
   * `soft` (default) mezcla en `overlay`: realza sobre superficies claras.
   * `bright` mezcla en `screen` y baja la opacidad — sobre una superficie
   * oscura el `overlay` con blanco apenas aclara y el cometa se pierde.
   */
  glare?: "soft" | "bright";
  /**
   * Cuánto crece la tarjeta mientras el puntero está encima. El default 1.02
   * es el de las tarjetas de la capa pública, donde el acercamiento forma
   * parte del gesto. `1` lo desactiva: en el panel una tarjeta de datos que
   * crece bajo el cursor desplaza la mirada de la cifra que se está leyendo.
   */
  scale?: number;
  className?: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = rootRef.current;
    const glare = glareRef.current;
    if (!el || !glare || reduced) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    let hovering = false;

    const loop = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = `perspective(900px) rotateX(${(-cy * depth).toFixed(2)}deg) rotateY(${(cx * depth).toFixed(2)}deg) translateZ(0) scale(${hovering ? scale : 1})`;
      // La parada NO mira `hovering`: en cuanto el lerp se asienta, el bucle
      // muere aunque el puntero siga encima. Antes se mantenía vivo a 60 fps
      // reescribiendo la misma cadena de transform mientras el ratón
      // descansaba, y solo para no perder la inclinación —porque al asentarse
      // limpiaba el transform—. Conservarlo cuando hay puntero resuelve las dos
      // cosas: la tarjeta se queda inclinada y el bucle se apaga.
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
        if (!hovering) el.style.transform = "";
      }
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    // `bright` va contenido: el reflejo se pinta por ENCIMA del contenido, y
    // en `screen` una opacidad alta lava el texto claro.
    const [core, halo] = glareTone === "bright" ? [0.13, 0.04] : [0.35, 0.1];

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      glare.style.background = `radial-gradient(circle at ${((tx + 0.5) * 100).toFixed(1)}% ${((ty + 0.5) * 100).toFixed(1)}%, rgb(255 255 255 / ${core}) 0%, rgb(255 255 255 / ${halo}) 35%, transparent 70%)`;
      start();
    };
    const onEnter = () => {
      hovering = true;
      glare.style.opacity = "1";
      el.style.willChange = "transform";
      start();
    };
    const onLeave = () => {
      hovering = false;
      tx = 0;
      ty = 0;
      glare.style.opacity = "0";
      el.style.willChange = "";
      start();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    };
  }, [depth, glareTone, scale, reduced]);

  return (
    <div ref={rootRef} className={cn("relative rounded-2xl [transform-style:preserve-3d]", className)}>
      {children}
      <div
        ref={glareRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[5] rounded-[inherit] opacity-0 transition-opacity duration-200",
          glareTone === "bright" ? "mix-blend-screen" : "mix-blend-overlay",
        )}
      />
    </div>
  );
}
