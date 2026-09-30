"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";
import { useFilm } from "@/modules/landing/ui/film/FilmRoot";

/**
 * El único acto de conversión de la home (D1): la prueba de 7 días. Lleva el
 * nicho elegido a `/comenzar`, que lo usa para preseleccionar el tipo de
 * negocio. Lo instrumenta la delegación de `core/analytics/outbound.ts`.
 */
export function FilmCta({ children, className, size = "lg" }: { children: ReactNode; className?: string; size?: "lg" | "md" }) {
  const { niche } = useFilm();
  return (
    <Link
      href={`/comenzar?plan=free_trial&nicho=${niche}`}
      prefetch={false}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground whitespace-nowrap",
        "shadow-[0_18px_50px_color-mix(in_srgb,var(--axi-brand)_32%,transparent)] transition-[transform,background-color] duration-150 active:scale-[.97]",
        "hover:bg-[color-mix(in_srgb,var(--axi-brand)_88%,white)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        size === "lg" ? "h-[54px] px-7 text-base" : "h-11 px-5 text-sm",
        className,
      )}
    >
      {children}
    </Link>
  );
}
