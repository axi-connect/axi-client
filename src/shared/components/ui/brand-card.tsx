import { cn } from "@/core/lib/utils";

/**
 * Tarjeta con ambientación de marca: un halo de coral anclado a la esquina que
 * sube al pasar el cursor, más un resplandor tricolor difuso. Se usa en las
 * superficies expresivas de la capa pública (mega-menú, secciones de producto),
 * nunca en zonas de trabajo del panel — ahí el contenido es sólido y sin
 * decoración (DESIGN §5.2).
 *
 * **Sustituye a la `GridCard`** que vino con la plantilla del mega-menú. Aquella
 * pintaba una rejilla de cuadros inclinada, y la rejilla no es de esta marca:
 * el lenguaje de superficie de axi son elipses suaves ancladas a una esquina
 * —lo que hacen el hero y la tarjeta del footer— no una retícula técnica. El
 * halo vive en `.brand-sheen` (globals.css) con las mismas coordenadas que
 * `.bg-brand-ambient`, así que si el ambiente de la marca cambia, cambia en
 * todos los sitios a la vez.
 *
 * De paso desaparecen dos defectos de la plantilla: las celdas resaltadas se
 * sorteaban con `Math.random()` en render (HTML distinto en servidor y cliente
 * ⇒ hidratación rota, DESIGN-SYSTEM §9.1) y el resplandor traía tres hex crudos
 * ajenos a la paleta. Aquí no hay aleatoriedad y todo color sale de un token.
 */
export function BrandCard({
  className,
  children,
  surface = "solid",
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * `glass` para las tarjetas que viven **dentro** de una superficie de cristal
   * (el panel del mega-menú): translúcidas, para no tapar su blur. `solid` en
   * página, donde la tarjeta es la superficie.
   */
  surface?: "solid" | "glass";
}) {
  return (
    <div
      className={cn(
        "group border-border relative isolate z-0 flex h-full flex-col justify-between gap-2.5 overflow-hidden rounded-xl border px-5 py-4",
        "hover:border-brand/35 transition-colors duration-200",
        surface === "glass"
          ? "bg-background/55 hover:bg-background/70"
          : "bg-card",
        className,
      )}
      {...props}
    >
      {/* Halo de marca. Solo transiciona `background-image` entre dos estados
          del mismo gradiente: nada se mueve, así que no hay nada que animar en
          el hilo principal. */}
      <div
        aria-hidden="true"
        className="brand-sheen pointer-events-none absolute inset-0 -z-10 transition-[background-image] duration-200"
      />

      {/* Resplandor tricolor del isotipo (coral → ámbar → violeta) leído de los
          tokens, muy difuso y solo en hover: es el momento de marca de la
          tarjeta, no su fondo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[10%] -z-10 opacity-0 blur-[46px] transition-opacity duration-200 group-hover:opacity-[0.10]"
        style={{
          backgroundImage:
            "conic-gradient(var(--color-brand) 0deg, var(--color-brand) 117deg," +
            "var(--color-accent-violet) 190deg, var(--color-accent-amber) 285deg, var(--color-brand) 360deg)",
        }}
      />

      {children}
    </div>
  );
}
