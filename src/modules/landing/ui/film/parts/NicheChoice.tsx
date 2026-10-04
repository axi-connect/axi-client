"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import type { FilmNiche } from "@/modules/landing/domain/film/niches";
import { useFilm } from "@/modules/landing/ui/film/FilmRoot";

/**
 * Una notificación de «¿Quién te escribe hoy?» (plan §13). Elegirla reescribe
 * la película. La pose (inclinación, profundidad, el paso al frente en blanco
 * de la elegida) la calcula el CSS (`.film-notif`) desde `--sel`, que pone
 * `aria-pressed`, y `--choose`, que mueve el motor; aquí solo el botón.
 */
export function NicheChoice({
  niche,
  children,
  className,
  style,
}: {
  niche: FilmNiche;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { niche: current, choose } = useFilm();
  const selected = current === niche;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => choose(niche)}
      data-anim="niche"
      data-thread-target={selected ? "" : undefined}
      className={cn("film-notif", className)}
      style={style}
    >
      {children}
    </button>
  );
}
