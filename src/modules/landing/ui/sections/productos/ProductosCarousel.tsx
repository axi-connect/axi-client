import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { CircularCarousel } from "@/modules/landing/ui/components/CircularCarousel";
import { CAPABILITIES, CAPABILITIES_SECTION } from "@/modules/landing/ui/content/productos.content";

/**
 * §3 — el índice interactivo de la página: las seis capacidades orbitando en
 * el carrusel elíptico; cada tarjeta navega a su ancla. Tercera y última isla
 * oscura del arranque (hero → reveal → carrusel), luego la página abre a luz.
 */
export default function ProductosCarousel() {
  return (
    <section
      aria-label="Capacidades del producto"
      className="dark theme-dark-island bg-background text-foreground w-full overflow-x-clip"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-24">
        <SectionHeading
          align="center"
          kicker={CAPABILITIES_SECTION.kicker}
          title={CAPABILITIES_SECTION.title}
        />
        <CircularCarousel items={CAPABILITIES} className="mt-12" />
      </div>
    </section>
  );
}
