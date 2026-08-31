import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";

/**
 * Marco de navegador premium para presentar capturas del producto: barra con
 * los tres puntos (la firma de `LaptopMockup`), pestaña con el isotipo y
 * campo de URL en mono. RSC — el marco no se anima; si hace falta parallax o
 * tilt, se envuelve desde fuera (`ParallaxLayer` / `TiltCard` de `shared/components/ui`).
 */
export function BrowserFrame({
  url,
  tab,
  children,
  className,
}: {
  /** URL visible en la barra (solo texto, sin protocolo). */
  url: string;
  /** Título de la pestaña activa. */
  tab: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-[18px] border shadow-overlay",
        className,
      )}
    >
      <div className="border-border/70 bg-secondary/60 flex items-center gap-3 border-b px-3.5 py-2">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="bg-brand size-[11px] rounded-full" />
          <span aria-hidden className="bg-accent-amber size-[11px] rounded-full" />
          <span aria-hidden className="bg-success size-[11px] rounded-full" />
        </span>
        <span className="border-border bg-background flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-medium">
          <BrandMark className="size-3.5" />
          {tab}
        </span>
        <span className="border-border bg-background text-muted-foreground min-w-0 flex-1 truncate rounded-full border px-3.5 py-1 font-mono text-[11px]">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}
