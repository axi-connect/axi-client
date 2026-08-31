import { CircularCarousel } from "@/modules/landing/ui/components/CircularCarousel";
import { CAPABILITIES, CAPABILITIES_SECTION } from "@/modules/landing/ui/content/productos.content";

/**
 * §3 — el índice interactivo de la página: las seis capacidades orbitando en
 * el carrusel elíptico; cada tarjeta navega a su ancla. Tercera y última isla
 * oscura del arranque (hero → reveal → carrusel), luego la página abre a luz.
 *
 * El fondo lleva el halo coral difuso del mockup aprobado (elipses ancladas,
 * el lenguaje de superficie de la marca — nunca retículas) y el kicker usa el
 * lockup de escena con guiones a los lados.
 */
export default function ProductosCarousel() {
  return (
    <section
      aria-label="Capacidades del producto"
      className="dark theme-dark-island bg-background text-foreground w-full overflow-x-clip"
      style={{
        backgroundImage:
          "radial-gradient(55% 42% at 50% 0%, color-mix(in srgb, var(--axi-brand) 11%, transparent), transparent 72%), radial-gradient(80% 60% at 50% 115%, color-mix(in srgb, var(--axi-brand-2) 7%, transparent), transparent 70%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-24">
        <div className="text-center">
          <p className="text-brand flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.16em] uppercase">
            <span aria-hidden className="bg-brand h-0.5 w-6 rounded-full" />
            {CAPABILITIES_SECTION.kicker}
            <span aria-hidden className="bg-brand h-0.5 w-6 rounded-full" />
          </p>
          <h2 className="font-heading mx-auto mt-4 max-w-[16ch] text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {CAPABILITIES_SECTION.title}
          </h2>
        </div>
        <CircularCarousel items={CAPABILITIES} className="mt-10" />
      </div>
    </section>
  );
}
