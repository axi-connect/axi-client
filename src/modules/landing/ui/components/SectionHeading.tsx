import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Cabecera de sección de la landing: kicker opcional + título Nexa + intro.
 * La jerarquía la hace la tipografía (peso/tamaño), no el color (DESIGN §4).
 */
export function SectionHeading({
  kicker,
  title,
  intro,
  align = "left",
  className,
}: {
  kicker?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {kicker ? (
        <p className="text-brand mb-3 text-sm font-medium tracking-wide">{kicker}</p>
      ) : null}
      <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
        {title}
      </h2>
      {intro ? (
        <p className={cn("text-muted-foreground mt-5 text-base leading-relaxed text-pretty", align === "center" && "mx-auto")}>
          {intro}
        </p>
      ) : null}
    </div>
  );
}
