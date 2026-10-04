"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { spring } from "@/core/styles/motion";

/**
 * Aparición al entrar en viewport (una sola vez): fade + leve desplazamiento
 * vertical con física de marca.
 *
 * Con movimiento reducido el contenido se muestra directo, y lo decide el CSS
 * (`[data-reveal]` en globals.css), no una rama de render: el servidor no sabe
 * la preferencia del visitante, y una rama (`useReducedMotion`) pintaba en el
 * cliente un `<div>` sin el `opacity: 0` que ya venía en el HTML. React no
 * corrige atributos al hidratar, así que el contenido se quedaba invisible
 * justo para quien pidió menos movimiento (medido el 2026-09-30).
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
  return (
    <motion.div
      data-reveal=""
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
