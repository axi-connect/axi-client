import type { SocialIconName } from "@/shared/components/layout/site/SocialIcon";

/**
 * Casa de desarrollo detrás de Axi Connect — contenido del bloque del footer.
 *
 * Cada campo degrada solo si falta, así que el bloque nunca muestra huecos:
 *
 *   - `url` vacío    → no se renderiza el botón de CTA.
 *   - `claim` vacío  → no se renderiza la línea de descripción.
 *   - `logoSrc` null → solo el nombre en tipografía de marca, sin imagen.
 *   - `socials` vacío → no se renderiza la fila de redes.
 *
 * PENDIENTE DE DATOS: `claim` (la frase de una línea sobre qué hace Kodecol).
 */
export const KODECOL = {
  name: "Kodecol",
  kicker: "Fundado y soportado por",
  /** Una línea. Qué hacen, no cómo se describen. */
  claim: "",
  /** URL absoluta del sitio, con https. Vacío = sin botón. */
  url: "https://www.kodecol.co/",
  /**
   * Logo. Admite URL remota (host permitido en `next.config.ts`) o ruta local
   * bajo `public/images/`. `null` = wordmark tipográfico, sin imagen.
   *
   * DEBE ser una silueta MONOCROMA con canal alfa. Se usa como máscara CSS y se
   * pinta con el token de color del tema, así que del archivo solo cuenta su
   * transparencia: el color se descarta (da igual si es blanco o negro). Un logo
   * a todo color no rompe nada — se aplana a silueta de un solo color, que
   * probablemente no es lo que quieres. Ver `KodecolBanner.tsx`.
   */
  logoSrc: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1785792158/isotipo_white_ttc04x.png",
  logoAlt: "Kodecol",
  ctaLabel: "Conoce Kodecol",
  socials: [
    {
      label: "Instagram",
      href: "https://www.instagram.com/kodecol.co/",
      icon: "instagram",
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/kodecol/",
      icon: "linkedin",
    },
    {
      label: "X",
      href: "https://x.com/kodecol_co",
      icon: "x",
    },
    {
      label: "GitHub",
      href: "https://github.com/kodecol",
      icon: "github",
    },
    {
      label: "Behance",
      href: "https://www.behance.net/kodecol",
      icon: "behance",
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/@kodecol",
      icon: "youtube",
    },
  ] as readonly {
    label: string;
    href: string;
    // `SocialIconName` en lugar de un union propio: duplicarlo ya había
    // derivado (faltaba "youtube", que sí existe en el diccionario de iconos).
    // Un nombre fuera de ese diccionario daría `Icon === undefined` y un crash
    // en render, y el `as` de este array lo ocultaría del typecheck.
    icon: SocialIconName;
  }[],
} as const;
