import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { BrandGradientCanvas } from "@/modules/landing/ui/components/BrandGradientCanvas";
import { CountUpNumber } from "@/modules/landing/ui/components/CountUpNumber";
import { HeroVideo } from "@/modules/landing/ui/components/HeroVideo";
import { HERO_VIDEO, PRODUCTOS_HERO } from "@/modules/landing/ui/content/productos.content";

/**
 * §1 Hero — el video manda, pero ÍNTEGRO.
 *
 * Antes era un fondo a sangre (`object-cover` sobre toda la sección): en un
 * portátil ancho y bajo la caja ronda 2,7:1 y un 16:9 perdía ~40% de su
 * altura, hasta el punto de que los rótulos del propio video subían a chocar
 * con el navbar. Ahora hay dos encuadres, uno por dispositivo:
 *
 * - **Escritorio (`md+`)**: marco de cine. El video se ajusta a la altura
 *   disponible y no pierde un píxel; el titular y los CTA viven DEBAJO, sobre
 *   la isla oscura, así que no pueden pisar los rótulos del video.
 * - **Móvil**: el máster vertical 9:16 a sangre — en un móvil esa proporción
 *   llena la pantalla sin recortar nada, y el texto vuelve a ir superpuesto.
 *
 * Es una sola pieza con variantes `md:`, no dos árboles con `hidden`: dos
 * árboles montarían dos `<video>` y el navegador descargaría el asset dos
 * veces.
 *
 * El `BrandGradientCanvas` se queda debajo de todo: en escritorio es lo que
 * rodea al marco —ambiente de marca en vez de negro plano, que es lo que
 * mantiene la escena envolvente— y sigue siendo el respaldo si el asset falla.
 */
export default function ProductosHero() {
  return (
    <section
      aria-label="Presentación del producto"
      className="dark theme-dark-island bg-background text-foreground relative flex min-h-svh w-full flex-col overflow-hidden"
    >
      {/* Fondo de marca: LCP instantáneo y fallback permanente del video. */}
      <BrandGradientCanvas className="absolute inset-0 h-full w-full" speed={0.9} grain={0.6} opacity={0.6} />

      {/* Escenario.
          Móvil: cubre la sección entera (el video es el fondo).
          Escritorio: único elemento flexible de la columna — la altura la
          reparte flex, jamás un `calc(100svh - alto fijo)` (DESIGN-SYSTEM
          §4.2). `container-type: size` lo convierte en la referencia contra
          la que el marco calcula su ancho. */}
      <div className="absolute inset-0 z-0 flex items-center justify-center md:relative md:inset-auto md:z-10 md:min-h-0 md:flex-1 md:[container-type:size] md:px-6 md:pt-28 [@media(max-height:760px)]:md:pt-24">
        {/* Marco.
            El ancho sale de `min(100%, 177.78cqh)` —el alto del escenario por
            16/9— porque un `aspect-video` con `width:100%` y `max-height:100%`
            NO encoge: al recortar el alto el navegador conserva el ancho y
            rompe la proporción. Midiendo contra el escenario el ancho es
            correcto tanto si manda el alto como si manda el ancho, y
            `aspect-video` deriva la altura. */}
        <div className="relative h-full w-full overflow-hidden md:aspect-video md:h-auto md:w-[min(100%,177.78cqh)] md:rounded-[20px] md:border md:border-border/60 md:shadow-[0_40px_100px_-40px_color-mix(in_srgb,var(--axi-brand)_38%,transparent)]">
          <HeroVideo
            desktop={HERO_VIDEO.desktop}
            mobile={HERO_VIDEO.mobile}
            ariaLabel={HERO_VIDEO.ariaLabel}
            soundOnLabel={PRODUCTOS_HERO.soundOn}
            soundOffLabel={PRODUCTOS_HERO.soundOff}
            playLabel={PRODUCTOS_HERO.play}
          />
        </div>
      </div>

      {/* Velo de legibilidad: SOLO en móvil, que es donde el texto se posa
          sobre el video. En escritorio el texto vive sobre la isla oscura. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] md:hidden"
        style={{
          background:
            "radial-gradient(85% 110% at 10% 100%, color-mix(in srgb, var(--background) 80%, transparent) 0%, transparent 58%)," +
            "linear-gradient(to top, color-mix(in srgb, var(--background) 90%, transparent) 0%, color-mix(in srgb, var(--background) 30%, transparent) 26%, transparent 48%)," +
            "linear-gradient(to bottom, color-mix(in srgb, var(--background) 45%, transparent) 0%, transparent 16%)",
        }}
      />

      {/* Lockup de dos líneas con jerarquía (muted plantea, strong remata).
          En móvil se apoya al pie sobre el velo; en escritorio queda bajo el
          marco, ya sin nada que taparle. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1220px] flex-1 shrink-0 flex-col justify-end px-6 pt-32 pb-10 sm:px-7 md:flex-none md:pt-8 md:pb-7 [@media(max-height:760px)]:md:pt-5 [@media(max-height:760px)]:md:pb-5">
        <h1 className="font-heading max-w-[34ch] text-2xl leading-[1.22] font-semibold tracking-tight sm:text-3xl lg:text-4xl [@media(max-height:760px)]:md:text-2xl">
          <span className="text-foreground/55 block">{PRODUCTOS_HERO.headlineMuted}</span>
          <span className="text-silver-gradient block">{PRODUCTOS_HERO.headlineStrong}</span>
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-3.5 [@media(max-height:760px)]:md:mt-4">
          <Button
            asChild
            className="group h-12 rounded-full px-7 text-[15px] shadow-[0_14px_40px_color-mix(in_srgb,var(--axi-brand)_40%,transparent)]"
          >
            <Link href={PRODUCTOS_HERO.ctaPrimary.href}>
              {PRODUCTOS_HERO.ctaPrimary.label}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="border-foreground/20 bg-foreground/10 hover:bg-foreground/15 h-12 rounded-full border px-7 text-[15px] backdrop-blur-md"
          >
            <a href={PRODUCTOS_HERO.ctaSecondary.href}>{PRODUCTOS_HERO.ctaSecondary.label}</a>
          </Button>
        </div>
      </div>

      {/* Barra de stats: delgada, cifra y etiqueta en línea. */}
      <div className="border-border/60 bg-background/50 relative z-10 shrink-0 border-t backdrop-blur-md">
        <dl className="mx-auto grid w-full max-w-[1220px] grid-cols-1 px-6 sm:grid-cols-3 sm:px-7">
          {PRODUCTOS_HERO.stats.map((stat, i) => (
            <div
              key={stat.id}
              className={
                i === 0
                  ? "flex items-baseline gap-2.5 py-3.5 max-sm:border-t-0 sm:pr-7"
                  : "border-border/60 flex items-baseline gap-2.5 py-3.5 max-sm:border-t sm:border-l sm:px-7"
              }
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-heading text-2xl font-bold tracking-tight tabular-nums">
                <CountUpNumber value={stat.value} />
              </dd>
              <dd className="text-muted-foreground text-xs">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
