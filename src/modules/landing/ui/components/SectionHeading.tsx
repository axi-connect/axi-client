import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Cabecera de sección de la landing: kicker opcional + título Nexa + intro.
 * La jerarquía la hace la tipografía (peso/tamaño), no el color (DESIGN §4).
 *
 * `as` existe por SEO, no por estilo: el tamaño no cambia. En la home el `h1`
 * lo pone `LandingHero`, así que aquí el default correcto es `h2`. Pero
 * `/precios`, `/casos`, `/integraciones`, `/productos` y `/soluciones` no
 * tienen hero — su primera cabecera ES el título de la página, y como este
 * componente emitía `h2` sin excepción, esas cinco páginas se publicaban sin
 * ningún `h1`. La primera cabecera de cada una pasa `as="h1"`; las demás
 * secciones de esa misma página se quedan en `h2`.
 */
export function SectionHeading({
  kicker,
  title,
  intro,
  align = "left",
  className,
  as: Heading = "h2",
}: {
  kicker?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {kicker ? (
        <p className="text-brand mb-3 text-sm font-medium tracking-wide">{kicker}</p>
      ) : null}
      <Heading className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
        {title}
      </Heading>
      {intro ? (
        <p className={cn("text-muted-foreground mt-5 text-base leading-relaxed text-pretty", align === "center" && "mx-auto")}>
          {intro}
        </p>
      ) : null}
    </div>
  );
}
