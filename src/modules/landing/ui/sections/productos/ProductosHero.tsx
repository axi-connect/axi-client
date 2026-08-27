import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { BrandGradientCanvas } from "@/modules/landing/ui/components/BrandGradientCanvas";
import { CountUpNumber } from "@/modules/landing/ui/components/CountUpNumber";
import { HeroVideo } from "@/modules/landing/ui/components/HeroVideo";
import { HERO_VIDEO, PRODUCTOS_HERO } from "@/modules/landing/ui/content/productos.content";

/**
 * §1 Hero — el video manda (decisión del mockup v2): isla oscura a pantalla
 * completa con el video en streaming encima del `BrandGradientCanvas` de
 * marca (que es también su respaldo si el asset no carga), texto mínimo
 * anclado abajo-izquierda y barra delgada de stats con count-up.
 *
 * El titular es plata (`.text-silver-gradient`, foreground→gris): premium y
 * corporativo, sin competir con el video — y teasea el diálogo con el que el
 * video de bienvenida abre.
 */
export default function ProductosHero() {
  return (
    <section
      aria-label="Presentación del producto"
      className="dark theme-dark-island bg-background text-foreground relative flex min-h-svh w-full flex-col overflow-hidden"
    >
      {/* Fondo de marca: LCP instantáneo y fallback permanente del video. */}
      <BrandGradientCanvas className="absolute inset-0 h-full w-full" speed={0.9} grain={0.6} opacity={0.6} />

      <HeroVideo
        desktop={HERO_VIDEO.desktop}
        mobile={HERO_VIDEO.mobile}
        poster={HERO_VIDEO.poster}
        ariaLabel={HERO_VIDEO.ariaLabel}
        soundOnLabel={PRODUCTOS_HERO.soundOn}
        soundOffLabel={PRODUCTOS_HERO.soundOff}
        playLabel={PRODUCTOS_HERO.play}
      />

      {/* Velo de legibilidad: solo al pie, para que el video respire. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--background) 85%, transparent) 0%, color-mix(in srgb, var(--background) 25%, transparent) 28%, transparent 46%)",
        }}
      />

      {/* Mensaje mínimo, abajo a la izquierda. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1220px] flex-1 flex-col justify-end px-6 pt-32 pb-12 sm:px-7">
        <h1 className="font-heading text-silver-gradient max-w-[24ch] text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          {PRODUCTOS_HERO.headline}
        </h1>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="h-11 px-6">
            <Link href={PRODUCTOS_HERO.ctaPrimary.href}>{PRODUCTOS_HERO.ctaPrimary.label}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-6 backdrop-blur-sm">
            <a href={PRODUCTOS_HERO.ctaSecondary.href}>{PRODUCTOS_HERO.ctaSecondary.label}</a>
          </Button>
        </div>
      </div>

      {/* Barra de stats: delgada, cifra y etiqueta en línea. */}
      <div className="border-border/60 bg-background/50 relative z-10 border-t backdrop-blur-md">
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
