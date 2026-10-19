"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import { QuietBoundary } from "@/shared/components/features/error-recovery/QuietBoundary";

/**
 * Las fibras del hero, fuera del primer render: el titular (el LCP) es HTML
 * servido y el canvas llega después de hidratar. Mientras tanto el hero es
 * tinta con el halo en CSS, y sin JS se queda así.
 */
const HeroFibers = dynamic(() => import("./HeroFibers").then((m) => m.HeroFibers), { ssr: false });

/**
 * Con `QuietBoundary`: si el chunk del canvas no carga (red cortada, HTML de
 * una versión anterior) el hero se queda en su estado sin JS en lugar de tumbar
 * la home (hotfix «Application error», 2026-10-19).
 */
export function HeroFibersLazy(props: ComponentProps<typeof HeroFibers>) {
  return (
    <QuietBoundary name="hero-fibers">
      <HeroFibers {...props} />
    </QuietBoundary>
  );
}
