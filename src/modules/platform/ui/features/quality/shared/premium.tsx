/**
 * Piezas del lenguaje premium de Calidad (quality_premium_plan.md, F1). Mismo
 * vocabulario que `SummaryTile`/`StatePill` de la ficha del tenant
 * (feat/entrega-premium): cuando las dos ramas convivan en main, se unifican en
 * `shared/components/features`.
 *
 * - `QualityTile`: tarjeta de UN tema — etiqueta muted arriba, una cifra o frase
 *   principal y una línea secundaria. Sin sombra: separa el borde.
 * - `InkPanel`: la isla de tinta, UNA por pantalla, para lo más accionable.
 * - `Meter`: progreso lineal (§9: nunca anillos), con marcas opcionales de umbral.
 * - `QualityStatus`: estado con el tono en el punto y el texto en foreground (AA).
 */
import { cn } from "@/core/lib/utils";
import { StatusBadge } from "../../../components/StatusBadge";

export function QualityTile({
  label,
  aside,
  children,
  className,
  as: Tag = "section",
  wrapLabel = false,
}: {
  label: React.ReactNode;
  /** La etiqueta larga baja a una segunda línea en vez de truncarse. */
  wrapLabel?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return (
    <Tag className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5", className)}>
      <header className="flex min-h-6 items-center justify-between gap-2">
        <h3
          className={cn("font-sans text-xs font-normal text-muted-foreground", wrapLabel ? "leading-relaxed" : "truncate")}
          title={typeof label === "string" ? label : undefined}
        >
          {label}
        </h3>
        {aside}
      </header>
      {children}
    </Tag>
  );
}

const FIGURE_SIZE = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-6xl",
} as const;

/** Cifra principal. `unit` va pequeña y muted al lado, en la misma línea base. */
export function BigFigure({
  value,
  unit,
  prefix,
  size = "lg",
  className,
}: {
  value: React.ReactNode;
  unit?: React.ReactNode;
  prefix?: React.ReactNode;
  size?: keyof typeof FIGURE_SIZE;
  className?: string;
}) {
  return (
    <p className={cn("flex items-baseline gap-1.5 whitespace-nowrap", className)}>
      {prefix ? <span className="text-sm text-muted-foreground">{prefix}</span> : null}
      <span className={cn("font-heading leading-none font-bold tracking-tight tabular-nums", FIGURE_SIZE[size])}>{value}</span>
      {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
    </p>
  );
}

/** Versalita de las islas y los grupos. */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-medium tracking-[0.12em] uppercase opacity-70", className)}>{children}</p>;
}

/**
 * Isla de tinta. En claro es `foreground` sobre `background` invertido; en
 * oscuro, tarjeta elevada con borde (la tinta invertida deslumbra). El brillo
 * coral sale del primitivo de marca con `color-mix`, nunca de un hex.
 */
export function InkPanel({
  children,
  className,
  label,
  glow = "top-right",
}: {
  children: React.ReactNode;
  className?: string;
  /** Nombre accesible de la región. */
  label: string;
  glow?: "top-right" | "top-left" | "none";
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "relative isolate flex min-w-0 flex-col gap-2 overflow-hidden rounded-3xl bg-foreground p-5 text-background dark:border dark:border-border dark:bg-card dark:text-foreground",
        className,
      )}
    >
      {glow !== "none" && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -top-24 -z-10 size-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--axi-brand)_45%,transparent),transparent_70%)]",
            glow === "top-right" ? "-right-24" : "-left-24",
          )}
        />
      )}
      {children}
    </section>
  );
}

/**
 * Barra de progreso lineal. `value` en 0..1. `marks` pinta rayas finas en los
 * umbrales (p. ej. 0,7 y 0,9 de Capacidades). `tone` colorea solo el tramo
 * recorrido; el texto que la acompaña sigue en foreground.
 */
export function Meter({
  value,
  marks = [],
  tone = "default",
  label,
  className,
}: {
  value: number | null;
  marks?: readonly number[];
  tone?: "default" | "warning" | "destructive" | "muted";
  /** Si la barra es la única portadora del dato, su nombre accesible. */
  label?: string;
  className?: string;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  const fill = {
    default: "bg-foreground",
    warning: "bg-warning",
    destructive: "bg-destructive",
    muted: "bg-muted-foreground",
  }[tone];
  return (
    <span
      className={cn("relative block h-1.5 min-w-10 rounded-full bg-muted", className)}
      {...(label
        ? { role: "progressbar", "aria-label": label, "aria-valuenow": Math.round(pct), "aria-valuemin": 0, "aria-valuemax": 100 }
        : { "aria-hidden": true })}
    >
      <span className={cn("absolute inset-y-0 left-0 rounded-full", fill)} style={{ width: `${pct}%` }} />
      {marks.map((mark) => (
        <span
          key={mark}
          aria-hidden="true"
          className="absolute -top-0.5 h-2.5 w-px bg-muted-foreground/60"
          style={{ left: `${mark * 100}%` }}
        />
      ))}
    </span>
  );
}

/** Estado de quality con el tono en el punto (AA en claro y oscuro). */
export function QualityStatus({ status, className }: { status: string; className?: string }) {
  return <StatusBadge status={status} appearance="dot" className={className} />;
}

export type QualityTone = "success" | "warning" | "destructive" | "info" | "neutral";

const TONE_DOT: Record<QualityTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

/**
 * Píldora con tono para etiquetas que no son estados del mapa (motivo de fallo,
 * severidad de un issue, criterio ilegible). Misma receta AA que `QualityStatus`.
 */
export function TonePill({
  tone,
  children,
  className,
  title,
}: {
  tone: QualityTone;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}

/** Punto de tono suelto, para listas donde el texto ya está al lado. */
export function ToneDot({ tone, className }: { tone: QualityTone; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-1.5 shrink-0 rounded-full", TONE_DOT[tone], className)} />;
}
