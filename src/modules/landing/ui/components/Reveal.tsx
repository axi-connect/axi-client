"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { spring } from "@/core/styles/motion";

/**
 * Aparición al entrar en viewport (una sola vez): fade + leve desplazamiento
 * vertical con física de marca. Con reduced-motion el contenido se muestra
 * directo, sin animación.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Retardo en segundos para escalonar tarjetas hermanas. */
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...spring.soft, delay }}
    >
      {children}
    </motion.div>
  );
}
