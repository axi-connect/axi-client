import type { MetadataRoute } from "next";

import { SITE_URL, siteUrl } from "@/core/config/env";
import { DISALLOWED_PREFIXES } from "@/core/seo/routes";

/**
 * `/robots.txt`.
 *
 * OJO: esta ruta está registrada en `PUBLIC_PATHS` (core/config/routes.ts).
 * Sin ese registro el middleware la trata como privada y devuelve 307 al login
 * — a Googlebot, que llega sin cookies.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...DISALLOWED_PREFIXES],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
