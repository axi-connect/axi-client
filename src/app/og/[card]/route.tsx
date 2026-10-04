import { filmCard } from "@/app/_og/film-card";
import { OG_CARDS, type OgCardPath } from "@/core/seo/og-cards";

/**
 * Las tarjetas de enlace por página (plan §26): `/og/precios`, `/og/productos`
 * y `/og/contacto`, generadas en el build.
 *
 * Es un route handler y no un `opengraph-image.tsx` en cada carpeta porque,
 * dentro del grupo `(public)`, Next le añade un sufijo con hash a la URL
 * (`/precios/opengraph-image-1ti4mc`), y aquí la imagen se declara de forma
 * explícita en la metadata (`ogImageFor`), así que la URL tiene que ser fija.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

const CARDS = ["precios", "productos", "contacto"] as const;

export function generateStaticParams() {
  return CARDS.map((card) => ({ card }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ card: string }> }) {
  const { card } = await params;
  const path = `/${card}` as OgCardPath;
  if (path === "/" || !(path in OG_CARDS)) return new Response(null, { status: 404 });
  return filmCard(OG_CARDS[path]);
}
