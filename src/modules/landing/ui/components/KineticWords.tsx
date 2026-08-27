"use client";

import { motion, useTransform } from "framer-motion";

import { cn } from "@/core/lib/utils";

/**
 * Forma mínima del MotionValue de progreso (framer-motion es módulo ambient en
 * este proyecto — no se importan sus tipos). Cualquier `scrollYProgress` cumple.
 */
export interface ScrollProgress {
  get: () => number;
}

/**
 * Titular cinético guiado por scroll: cada palabra aparece (opacity + y +
 * rotate leve) en su propio tramo del progreso. Un MotionValue por propiedad
 * y por palabra — framer escribe el estilo directo en el nodo, cero
 * re-renders de React durante el scroll.
 *
 * Accesibilidad: el wrapper lleva el texto completo en `aria-label` y las
 * palabras animadas quedan `aria-hidden` (un lector de pantalla no debe leer
 * palabra... por... palabra).
 */
export function KineticWords({
  text,
  progress,
  from,
  step,
  span,
  className,
}: {
  text: string;
  progress: ScrollProgress;
  /** Progreso (0–1) en el que empieza la primera palabra. */
  from: number;
  /** Separación de arranque entre palabras consecutivas. */
  step: number;
  /** Duración (en progreso) de la aparición de cada palabra. */
  span: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span aria-label={text} className={cn("inline-block", className)}>
      {words.map((word, i) => (
        <KineticWord
          key={`${word}-${i}`}
          progress={progress}
          from={from + i * step}
          to={from + i * step + span}
        >
          {word}
        </KineticWord>
      ))}
    </span>
  );
}

function KineticWord({
  progress,
  from,
  to,
  children,
}: {
  progress: ScrollProgress;
  from: number;
  to: number;
  children: string;
}) {
  const opacity = useTransform(progress, [from, to], [0, 1]);
  const y = useTransform(progress, [from, to], [26, 0]);
  const rotate = useTransform(progress, [from, to], [5, 0]);

  return (
    <motion.span
      aria-hidden
      style={{ opacity, y, rotate }}
      className="mr-[0.28em] inline-block origin-left will-change-transform"
    >
      {children}
    </motion.span>
  );
}
