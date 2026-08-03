/**
 * Casa de desarrollo detrás de Axi Connect — contenido del bloque del footer.
 *
 * PENDIENTE DE DATOS: `url`, `claim`, `logoSrc` y `socials` los aporta negocio.
 * El bloque está construido para degradar con dignidad mientras falten (mismo
 * criterio que `BrandLogo`, que cae a wordmark tipográfico si no hay imagen):
 *
 *   - `url` vacío   → no se renderiza el botón de CTA.
 *   - `logoSrc` null → se muestra el nombre en tipografía de marca, sin imagen.
 *   - `socials` vacío → no se renderiza la fila de redes.
 *
 * Activarlo es rellenar este objeto: no hay que tocar UI.
 *
 * El logo debe vivir bajo `public/images/` (no `public/brand/`): el matcher del
 * middleware solo exime `images|fonts|assets`, y cualquier otra carpeta de
 * `public/` redirige a login a los visitantes sin sesión.
 */
export const KODECOL = {
  name: "Kodecol",
  kicker: "Fundado y soportado por",
  /** Una línea. Qué hacen, no cómo se describen. */
  claim: "",
  /** URL absoluta del sitio, con https. Vacío = sin botón. */
  url: "",
  /** Ruta bajo `public/images/`. `null` = wordmark tipográfico. */
  logoSrc: null as string | null,
  logoAlt: "Kodecol",
  ctaLabel: "Conoce Kodecol",
  socials: [] as readonly {
    label: string;
    href: string;
    icon: "linkedin" | "instagram" | "behance" | "github" | "x";
  }[],
} as const;
