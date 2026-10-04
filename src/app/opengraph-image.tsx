import { OG_CARDS, OG_SIZE } from "@/core/seo/og-cards";

import { filmCard } from "./_og/film-card";

/**
 * La tarjeta de enlace de la home (plan §26, dirección A «La película»). La
 * usan también las rutas que no tienen tarjeta propia (`OG_IMAGE` en `site.ts`).
 */
export const alt = OG_CARDS["/"].alt;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return filmCard(OG_CARDS["/"]);
}
