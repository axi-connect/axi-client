"use client";

import Image from "next/image";

import { cn } from "@/core/lib/utils";

interface AxelOrbProps {
  /** true mientras Axel piensa: el orbe respira y el cometa se aviva. */
  busy?: boolean;
  size?: "sm" | "lg";
  className?: string;
}

/** El retrato ya viene recortado en cuadrado sobre la cabeza (384px = 4× del orbe). */
const FACE_SRC = "/images/mascots/cmo-orb.webp";

/**
 * El orbe de Axel: la única presencia de marca del módulo, y desde el rediseño
 * también **la cara del personaje**. A 84px no se leía; de ahí los 96.
 *
 * El anillo cometa NO es un efecto nuevo — es `@property --comet-angle` con la
 * receta de `.channel-surface::after` de `globals.css`, ya aprobada en el mockup
 * de canales. Lo que sí es nuevo es cómo se integra con el retrato, y son dos
 * capas: la vignette violeta del borde interior (`.axel-orb-veil`) y el derrame
 * difuminado del mismo cónico (`.axel-orb-spill`). Sin ellas el anillo se lee
 * como un aro puesto encima de un avatar recortado.
 *
 * `busy` existe porque **no hay streaming**: un turno puede tardar cuarenta
 * segundos y sin una señal de vida el usuario cree que se colgó. El orbe
 * respirando es la señal más barata posible — sin layout shift, sin spinner
 * genérico, y se detiene solo con `prefers-reduced-motion` porque la animación
 * vive en CSS.
 */
export function AxelOrb({ busy = false, size = "lg", className }: AxelOrbProps) {
  const box = size === "lg" ? "size-[96px]" : "size-[34px]";

  return (
    <div className={cn("relative flex-none", box, className)}>
      <div className="axel-orb-glow" aria-hidden="true" />
      <div
        role="img"
        aria-label="Axel, tu director de mercadeo"
        className={cn(
          "axel-orb absolute inset-0 overflow-hidden rounded-full border border-border",
          "bg-background shadow-float",
          busy && "axel-orb--busy",
        )}
      >
        <Image
          src={FACE_SRC}
          alt=""
          fill
          sizes={size === "lg" ? "96px" : "34px"}
          priority={size === "lg"}
          className="axel-orb-face"
        />
        <span className="axel-orb-veil" aria-hidden="true" />
        <span className="axel-orb-spill" aria-hidden="true" />
      </div>
    </div>
  );
}
