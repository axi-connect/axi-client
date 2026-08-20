"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";

interface AxelOrbProps {
  /** true mientras Axel piensa: el orbe respira. */
  busy?: boolean;
  size?: "sm" | "lg";
  className?: string;
}

/**
 * El orbe de Axel: la única presencia de marca del módulo.
 *
 * El anillo cometa NO es un efecto nuevo — es `@property --comet-angle` con la
 * receta de `.channel-surface::after` de `globals.css`, ya aprobada en el mockup
 * de canales. Reutilizarlo en vez de inventar otro brillo es lo que mantiene el
 * panel con una sola firma visual.
 *
 * `busy` existe porque **no hay streaming**: un turno puede tardar cuarenta
 * segundos y sin una señal de vida el usuario cree que se colgó. El orbe
 * respirando es la señal más barata posible — sin layout shift, sin spinner
 * genérico, y se detiene solo con `prefers-reduced-motion` porque la animación
 * vive en CSS.
 */
export function AxelOrb({ busy = false, size = "lg", className }: AxelOrbProps) {
  const box = size === "lg" ? "size-[84px]" : "size-[34px]";
  const icon = size === "lg" ? "size-6" : "size-4";

  return (
    <div className={cn("relative flex-none", box, className)}>
      <div className="axel-orb-glow" aria-hidden="true" />
      <div
        className={cn(
          "axel-orb absolute inset-0 grid place-items-center rounded-full",
          "border border-border bg-background text-accent-violet shadow-float",
          busy && "axel-orb--busy",
        )}
      >
        <Sparkles className={icon} aria-hidden="true" />
      </div>
    </div>
  );
}
