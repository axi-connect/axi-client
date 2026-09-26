import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Island, type IslandLook } from "@/shared/components/features/island";

/**
 * Piezas del bento de resumen (DESIGN-SYSTEM §9.5). Una ficha es UN tema:
 * etiqueta arriba, un `aside` opcional (una `StatePill` o un `BentoLink`), una
 * cifra o frase principal y una línea secundaria. La ficha no decide su lugar
 * en la rejilla: lo decide la vista con `className` (col-span, anclas).
 *
 * Diferencia con `StatTile` (features/stat-tile): aquel es el KPI denso de
 * una fila de métricas; esto es la ficha de un tablero «de un vistazo».
 */
export function BentoTile({
  label,
  aside,
  busy = false,
  children,
  className,
}: {
  label: string;
  aside?: React.ReactNode;
  /** Recargando con el dato anterior a la vista: se atenúa y se anuncia ocupada (`aria-busy`), sin volver a la silueta. */
  busy?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-busy={busy || undefined}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5 transition-opacity duration-200",
        busy && "opacity-60",
        className,
      )}
    >
      <header className="flex min-h-6 items-center justify-between gap-2">
        {/* Un h2 en Poppins: la etiqueta es pequeña, no un titular (§3.2). */}
        <h2 className="truncate font-sans text-xs font-normal text-muted-foreground">{label}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export type StatePillTone = "success" | "warning" | "destructive" | "neutral";

const DOT: Record<StatePillTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground",
};

/**
 * Estado de una ficha: `bg-muted` + punto del color + texto en foreground.
 * El color vive en el punto, nunca en el texto (verde y ámbar como texto no
 * pasan AA a 12 px, §10). Sustituye a los badges tintados en las fichas.
 */
export function StatePill({ tone, children }: { tone: StatePillTone; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap">
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}

/** La cifra de la ficha: Nexa grande, tabular, con su unidad al lado. Nunca una cifra sin unidad. */
export function BentoFigure({ value, unit, size = "lg" }: { value: string; unit?: string; size?: "lg" | "md" }) {
  return (
    <p className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span
        className={cn(
          "font-heading leading-none font-bold tracking-tight tabular-nums",
          size === "lg" ? "text-4xl" : "text-3xl",
        )}
      >
        {value}
      </span>
      {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
    </p>
  );
}

/**
 * Enlace de una ficha: foreground + flecha, subrayado al pasar, objetivo de
 * 24 px. No `text-brand`: el coral a 12–14 px da 3,58:1 y no pasa AA.
 */
export function BentoLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-6 w-fit items-center gap-1 rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

/**
 * La isla de tinta: UNA por pantalla, para lo más accionable (§9.5). Su
 * material (tinta o cristal blanco o negro) y su brillo salen de
 * `ISLAND_DEFAULTS`; una isla distinta lo pide con `material`, `tone` o
 * `glow`. Lo de dentro usa los tokens de siempre: la isla redefine el esquema
 * en su subárbol. Sus botones son `variant="contrast"`.
 */
export function InkIsland({
  label,
  children,
  className,
  ...look
}: IslandLook & {
  /** Nombre de la región para el lector de pantalla. */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Island as="section" aria-label={label} {...look} className={cn("flex min-w-0 flex-col gap-2 p-6", className)}>
      {children}
    </Island>
  );
}

/** El antetítulo de una isla o un panel de marca: versalitas pequeñas con tracking amplio. */
export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium tracking-[0.12em] uppercase opacity-70">{children}</p>;
}
