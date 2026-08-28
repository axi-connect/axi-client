import Link from "next/link";
import { ArrowRight } from "lucide-react";

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

      {/* Velo de legibilidad: banda al pie + viñeta radial en la esquina del
          texto — garantiza contraste exactamente donde vive el titular, sin
          oscurecer el cuadro (patrón de heros de video de Apple TV+). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 110% at 10% 100%, color-mix(in srgb, var(--background) 80%, transparent) 0%, transparent 58%)," +
            "linear-gradient(to top, color-mix(in srgb, var(--background) 90%, transparent) 0%, color-mix(in srgb, var(--background) 30%, transparent) 26%, transparent 48%)," +
            "linear-gradient(to bottom, color-mix(in srgb, var(--background) 45%, transparent) 0%, transparent 16%)",
        }}
      />

      {/* Lockup de dos líneas con jerarquía (muted plantea, strong remata) en
          la esquina inferior izquierda, sobre la viñeta — el video manda. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1220px] flex-1 flex-col justify-end px-6 pt-32 pb-10 sm:px-7">
        <h1 className="font-heading max-w-[34ch] text-2xl leading-[1.22] font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          <span className="text-foreground/55 block">{PRODUCTOS_HERO.headlineMuted}</span>
          <span className="text-silver-gradient block">{PRODUCTOS_HERO.headlineStrong}</span>
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-3.5">
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
