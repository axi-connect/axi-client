"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { spring } from "@/core/styles/motion";

/** Recorrido de color del embudo: coral → ámbar → violeta (tokens, sin hex). */
const BAR_GRADIENTS = [
  "linear-gradient(90deg, var(--axi-brand), var(--axi-brand-2))",
  "linear-gradient(90deg, var(--axi-brand), var(--axi-amber))",
  "linear-gradient(90deg, var(--axi-amber), var(--axi-amber))",
  "linear-gradient(90deg, var(--axi-amber), var(--axi-violet))",
];

export interface FunnelItem {
  label: string;
  display: string;
  widthPct: number;
}

/**
 * Mini-embudo de conversión (hero como respaldo del sub, y §6 dentro del
 * dashboard): barras con gradiente de marca que se despliegan al entrar en
 * viewport (solo `transform: scaleX`, compositor).
 */
export function FunnelPreview({
  items,
  className,
}: {
  items: ReadonlyArray<FunnelItem>;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {items.map((item, i) => (
        <div key={item.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-mono font-medium tabular-nums">{item.display}</span>
          </div>
          <div className="bg-secondary h-3 overflow-hidden rounded-full">
            <motion.div
              aria-hidden
              className="h-full origin-left rounded-full"
              style={{ width: `${item.widthPct}%`, background: BAR_GRADIENTS[i % BAR_GRADIENTS.length] }}
              initial={reduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ ...spring.soft, delay: i * 0.12 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
