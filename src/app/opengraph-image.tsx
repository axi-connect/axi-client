import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { OG_IMAGE } from "@/core/seo/site";
import { BRAND_RIBBONS } from "@/shared/components/ui/brand-mark";

/**
 * La tarjeta de enlace del sitio (WhatsApp, LinkedIn, X…), en el lenguaje de
 * la película: tinta, el isotipo con el halo coral → violeta → ámbar del
 * cierre y el titular del hero en Nexa. Solo piezas aprobadas; sin textos
 * nuevos.
 *
 * `next/og` no lee WOFF2: la Nexa va en TTF en `_og/` (carpeta privada del
 * App Router). Se genera en el build (ruta estática), así que leer del disco
 * es seguro.
 */
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

const font = (file: string) => readFile(join(process.cwd(), "src/app/_og", file));

export default async function OpengraphImage() {
  const [heavy, light] = await Promise.all([font("Nexa-Heavy.ttf"), font("Nexa-ExtraLight.ttf")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#f5f5f7",
          fontFamily: "Nexa",
          position: "relative",
        }}
      >
        {/* El halo del cierre, detrás del isotipo. */}
        <div
          style={{
            position: "absolute",
            left: 300,
            top: -110,
            width: 600,
            height: 600,
            // Paradas en px y sin `closest-side` ni desenfoque, que satori no
            // soporta: el mismo degradado del cierre, con caída suave al borde.
            background:
              "radial-gradient(circle at 300px 300px, rgba(230,87,89,0.34) 0px, rgba(154,79,255,0.2) 165px, rgba(255,213,128,0.08) 245px, rgba(10,10,11,0) 300px)",
          }}
        />
        <svg width="180" height="180" viewBox="0 0 500 500" style={{ marginTop: -24 }}>
          <defs>
            {BRAND_RIBBONS.map((r) => (
              <linearGradient key={r.name} id={`og-${r.name}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
                <stop stopColor={r.from} />
                <stop offset="1" stopColor={r.to} />
              </linearGradient>
            ))}
          </defs>
          {BRAND_RIBBONS.map((r) => (
            <path key={r.name} d={r.d} fillRule={r.evenOdd ? "evenodd" : undefined} fill={`url(#og-${r.name})`} />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 34, lineHeight: 1.02, letterSpacing: "-0.045em" }}>
          <span style={{ fontSize: 86, fontWeight: 700 }}>Vende en</span>
          <span style={{ fontSize: 86, fontWeight: 200 }}>cada conversación.</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Nexa", data: heavy, weight: 700, style: "normal" },
        { name: "Nexa", data: light, weight: 200, style: "normal" },
      ],
    },
  );
}
