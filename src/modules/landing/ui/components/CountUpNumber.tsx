"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Cifra con count-up disparado al entrar en viewport (una sola vez).
 * Mismo patrón que `analytics/CountUpValue` pero gatillado por scroll (la
 * landing anima al descubrir la sección, no al montar). Con reduced-motion
 * muestra el valor final directo.
 */
export function CountUpNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(() => (reduced ? value : 0));
  const animated = useRef(false);

  useEffect(() => {
    if (!inView) return;
    if (animated.current || reduced) {
      setDisplay(value);
      return;
    }
    animated.current = true;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (latest: number) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  const format = (n: number) =>
    `${prefix}${n.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
