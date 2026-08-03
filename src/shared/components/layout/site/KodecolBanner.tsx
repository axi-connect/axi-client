import Image from "next/image";

import { Button } from "@/shared/components/ui/button";
import { KODECOL } from "@/shared/components/layout/site/kodecol.content";
import { SocialIcon } from "@/shared/components/layout/site/SocialIcon";

/**
 * Bloque de la casa de desarrollo detrás de Axi Connect.
 *
 * Intención de diseño: que se lea como una **credencial**, no como un banner
 * pegado al final. Dos decisiones sostienen eso:
 *
 *  1. **Acento violeta, no coral.** El coral es el color de acción de Axi; si
 *     este bloque lo usara, competiría con los CTA de la página. El violeta lo
 *     separa como firma de otra marca (DESIGN §3.1 — y el footer no usa ámbar,
 *     así que no se rompe la regla de "nunca los tres acentos juntos").
 *  2. **La jerarquía la hace la tipografía.** Kicker pequeño en mayúsculas +
 *     nombre en Nexa grande, sin recuadros ni sombras duras (DESIGN §4).
 *
 * Los datos viven en `kodecol.content.ts` y el bloque degrada solo si faltan.
 */
export function KodecolBanner() {
  const hasUrl = KODECOL.url.length > 0;

  return (
    <section
      aria-label={`${KODECOL.kicker} ${KODECOL.name}`}
      className="border-border/60 relative z-10 mt-14 w-full overflow-hidden border-t"
    >
      {/* Patrón de puntos: textura, no decoración protagonista. Opacidad muy
          baja para que no compita con el contenido del footer. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--axi-violet) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--axi-violet) 8%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 text-center md:flex-row md:justify-between md:gap-10 md:text-left">
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
          {KODECOL.logoSrc ? (
            <Image
              src={KODECOL.logoSrc}
              alt={KODECOL.logoAlt}
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-xl object-contain transition-transform duration-200 hover:scale-105"
            />
          ) : null}

          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.18em] uppercase">
              {KODECOL.kicker}
            </p>
            <p className="font-heading text-accent-violet mt-1.5 text-2xl font-bold tracking-tight">
              {KODECOL.name}
            </p>
            {KODECOL.claim ? (
              <p className="text-muted-foreground mt-2 max-w-[46ch] text-sm leading-relaxed text-pretty">
                {KODECOL.claim}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:items-end">
          {hasUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={KODECOL.url} target="_blank" rel="noopener noreferrer">
                {KODECOL.ctaLabel}
              </a>
            </Button>
          ) : null}

          {KODECOL.socials.length > 0 ? (
            <div className="text-muted-foreground flex gap-3">
              {KODECOL.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={`${KODECOL.name} en ${social.label}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent-violet focus-visible:ring-ring/50 rounded-md p-1 transition-colors duration-200 focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <SocialIcon name={social.icon} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
