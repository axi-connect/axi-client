import type { Metadata } from "next";

import { siteUrl } from "@/core/config/env";
import { OG_IMAGE } from "@/core/seo/site";

/**
 * Metadata de una página pública.
 *
 * Existe porque Next **no** deriva `openGraph` de `title`/`description`: hereda
 * el `openGraph` del layout raíz tal cual. Sin este helper, las doce rutas
 * públicas compartían el mismo preview de enlace —mismo título y misma
 * descripción— por muy distinta que fuera la página, que es lo que pasaba antes.
 *
 * El `title` que se pasa aquí es el corto ("Precios"): el template del layout
 * raíz le añade " — Axi Connect" para la pestaña del navegador. Para Open Graph
 * se compone el título completo a mano, porque las tarjetas de WhatsApp,
 * LinkedIn y X se muestran sin contexto de sitio.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
}: {
  title: string;
  description: string;
  path: string;
  /** Título completo para la tarjeta social, si el corto no se explica solo. */
  ogTitle?: string;
}): Metadata {
  const socialTitle = ogTitle ?? `${title} — Axi Connect`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Axi Connect",
      locale: "es_CO",
      title: socialTitle,
      description,
      url: siteUrl(path),
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/**
 * Metadata de una ruta que no debe indexarse (login, logout, panel privado).
 * `follow: true` deja que Google siga los enlaces salientes hacia el sitio
 * público sin listar la página en resultados.
 */
export function noindexMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  };
}
