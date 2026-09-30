"use client";

import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import type { FilmNiche } from "@/modules/landing/domain/film/niches";
import { useFilm } from "@/modules/landing/ui/film/FilmRoot";

/** Una ficha de «¿Quién te escribe hoy?». Elegirla reescribe la película. */
export function NicheChoice({ niche, children, className }: { niche: FilmNiche; children: ReactNode; className?: string }) {
  const { niche: current, choose } = useFilm();
  const selected = current === niche;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => choose(niche)}
      data-anim="niche"
      className={cn(
        "film-card group relative flex cursor-pointer flex-col justify-between gap-6 p-6 text-left text-foreground transition-[box-shadow,background-color] duration-300",
        "hover:bg-[var(--film-surface-2)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected && "bg-[var(--film-surface-2)] shadow-[0_0_0_2px_var(--axi-brand),0_30px_80px_color-mix(in_srgb,var(--axi-brand)_22%,transparent)]",
        className,
      )}
    >
      <span
        className={cn(
          "film-chip absolute -top-3.5 right-5 border-[color-mix(in_srgb,var(--axi-brand)_45%,transparent)] bg-[color-mix(in_srgb,var(--axi-brand)_16%,var(--background))] transition-opacity",
          selected ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      >
        Elegido
      </span>
      {children}
    </button>
  );
}
