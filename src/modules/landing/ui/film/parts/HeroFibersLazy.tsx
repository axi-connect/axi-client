"use client";

import dynamic from "next/dynamic";

/**
 * Las fibras del hero, fuera del primer render: el titular (el LCP) es HTML
 * servido y el canvas llega después de hidratar. Mientras tanto el hero es
 * tinta con el halo en CSS, y sin JS se queda así.
 */
export const HeroFibersLazy = dynamic(() => import("./HeroFibers").then((m) => m.HeroFibers), { ssr: false });
