import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Cabecera de escena: antetítulo del capítulo, una frase en Nexa (el tramo
 * fino va en `thin`) y, si hace falta, una línea de apoyo. Nada más: la escena
 * la cuenta su animación, no el texto.
 */
export function SceneHead({
  eyebrow,
  tone = "brand",
  strong,
  thin,
  lead,
  as: Tag = "h2",
  size = "lg",
  id,
  className,
}: {
  /** El id del titular, para el `aria-labelledby` de la sección. */
  id?: string;
  eyebrow: string;
  tone?: "brand" | "violet" | "amber";
  strong: ReactNode;
  thin?: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2";
  size?: "xl" | "lg" | "md";
  className?: string;
}) {
  const color = tone === "violet" ? "text-[var(--axi-violet)]" : tone === "amber" ? "text-[var(--axi-amber)]" : "text-[var(--axi-brand)]";
  const sizes = {
    xl: "text-[clamp(44px,6.4vw,96px)]",
    lg: "text-[clamp(34px,4.4vw,64px)]",
    md: "text-[clamp(30px,3.6vw,52px)]",
  } as const;
  return (
    <div className={cn("relative z-[2]", className)} data-anim="head">
      <p className={cn("film-eyebrow mb-4", color)}>{eyebrow}</p>
      <Tag id={id} className={cn("film-h", sizes[size])}>
        {strong}
        {thin ? (
          <>
            {" "}
            <span className="t">{thin}</span>
          </>
        ) : null}
      </Tag>
      {lead ? <p className="film-lead mt-5 max-w-[34rem] text-[clamp(15px,1.3vw,18px)] leading-relaxed">{lead}</p> : null}
    </div>
  );
}
