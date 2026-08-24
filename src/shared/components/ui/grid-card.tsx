import { cn } from "@/core/lib/utils";

/**
 * Tarjeta con textura de rejilla y resplandor tricolor de marca al pasar el
 * cursor. Se usa en las superficies expresivas de la capa pública (mega-menú,
 * secciones de producto), nunca en zonas de trabajo del panel — ahí el
 * contenido es sólido y sin decoración (DESIGN §5.2).
 *
 * Dos desviaciones deliberadas respecto de la plantilla de la que viene:
 *
 * 1. **El patrón es determinista.** La versión original sorteaba las celdas
 *    resaltadas con `Math.random()` en render, lo que produce un HTML distinto
 *    en el servidor y en el cliente: hidratación rota (prohibido en
 *    DESIGN-SYSTEM §9.1). Aquí las celdas salen de una tabla fija indexada por
 *    `pattern`, así que la misma tarjeta se pinta siempre igual y cada tarjeta
 *    de una fila se pinta distinta.
 * 2. **Sin SVG ni `useId`.** El patrón son dos gradientes CSS repetidos. Eso
 *    evita marcar el archivo como cliente solo para generar un id de `<pattern>`
 *    y deja el componente utilizable desde un Server Component sin coste de JS.
 */

/** Celdas resaltadas por variante, en coordenadas [columna, fila] de la rejilla. */
const PATTERNS: readonly (readonly (readonly [number, number])[])[] = [
  [[1, 1], [3, 2], [5, 1], [2, 4], [6, 3]],
  [[2, 1], [4, 3], [1, 3], [5, 4], [3, 5]],
  [[3, 1], [1, 2], [6, 2], [4, 4], [2, 5]],
  [[1, 4], [4, 1], [2, 2], [6, 4], [5, 2]],
];

/** Lado de la celda, en px. Debe coincidir con el `background-size` de abajo. */
const CELL = 30;

export function GridCard({
  className,
  children,
  pattern = 0,
  ...props
}: React.ComponentProps<"div"> & {
  /** Elige la variante del patrón; en una lista se pasa el índice del ítem. */
  pattern?: number;
}) {
  const squares = PATTERNS[Math.abs(pattern) % PATTERNS.length];

  return (
    <div
      className={cn(
        "group bg-card border-border relative isolate z-0 flex h-full flex-col justify-between gap-2.5 overflow-hidden rounded-xl border px-5 py-4",
        "hover:border-brand/35 transition-colors duration-200",
        className,
      )}
      {...props}
    >
      {/* Textura: la rejilla se inclina y sube 8px, y al hacer hover vuelve a su
          sitio. Solo se anima `transform` (compositor), y el gradiente de máscara
          la desvanece hacia la esquina para que no compita con el texto. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className={cn(
            "absolute -inset-[25%] translate-y-2 -skew-y-12 transition-transform duration-200 ease-out group-hover:translate-y-0",
            "[mask-image:linear-gradient(225deg,black,transparent_72%)]",
          )}
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in srgb, var(--color-foreground) 9%, transparent) 1px, transparent 1px)," +
              "linear-gradient(to bottom, color-mix(in srgb, var(--color-foreground) 9%, transparent) 1px, transparent 1px)",
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
        >
          {squares.map(([column, row]) => (
            <span
              key={`${column}-${row}`}
              className="bg-border/50 absolute"
              style={{
                left: column * CELL + 1,
                top: row * CELL + 1,
                width: CELL - 1,
                height: CELL - 1,
              }}
            />
          ))}
        </div>

        {/* Resplandor de marca: el gradiente tricolor del isotipo (coral → ámbar
            → violeta) leído de los tokens. La plantilla original traía tres hex
            crudos ajenos a la paleta (DESIGN §8, mandamiento 2). */}
        <div
          className="absolute -inset-[10%] opacity-0 blur-[46px] transition-opacity duration-200 group-hover:opacity-[0.12]"
          style={{
            backgroundImage:
              "conic-gradient(var(--color-brand) 0deg, var(--color-brand) 117deg," +
              "var(--color-accent-violet) 190deg, var(--color-accent-amber) 285deg, var(--color-brand) 360deg)",
          }}
        />
      </div>

      {children}
    </div>
  );
}
