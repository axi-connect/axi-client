"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fade } from "@/core/styles/motion";

/**
 * Entrada en cascada de las cards de un tab (60 ms por posición): opacity
 * 0→1 + y 8→0 SOLO en el primer montaje — un refetch no re-anima porque el
 * componente sigue montado. Con reduced-motion no anima.
 */
export function StaggerIn({
  index,
  children,
  className,
}: {
  /** Posición de la card en el tab (define el delay de la cascada). */
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { ...fade.fast, delay: index * 0.06 }}
    >
      {children}
    </motion.div>
  );
}
