import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Marquee de logos: la pista se duplica (la copia es `aria-hidden`) y se
 * desplaza en loop continuo con CSS puro (`logo-marquee` en globals.css) —
 * compositor, pausa al hover y desactivado con `prefers-reduced-motion`
 * (queda como fila con scroll horizontal natural). Los bordes se desvanecen
 * con `mask-image`.
 */
export function LogoMarquee({
  children,
  durationSeconds = 30,
  className,
}: {
  children: ReactNode;
  /** Segundos por vuelta completa de la pista. */
  durationSeconds?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("group/marquee w-full overflow-hidden", className)}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div
        className="animate-logo-marquee flex w-max items-center motion-reduce:w-full motion-reduce:overflow-x-auto"
        style={{ "--marquee-duration": `${durationSeconds}s` } as CSSProperties}
      >
        <div className="flex shrink-0 items-center gap-x-14 pr-14">{children}</div>
        <div aria-hidden className="flex shrink-0 items-center gap-x-14 pr-14 motion-reduce:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
