"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/core/lib/utils";

export type InlineFigure = {
  key: string;
  value: number | string;
  label: string;
  /** Cifra buena: se pinta en `success`. El resto va en el color del texto. */
  good?: boolean;
};

export type InlineFiguresAccent = "violet" | "brand";

const ACCENT_CLASSES: Record<InlineFiguresAccent, string> = {
  violet: "border-l-accent-violet/60",
  brand: "border-l-brand",
};

interface InlineFiguresProps {
  /** La etiqueta en versalitas («Tus agentes · hoy», «Ritmo · esta semana»). */
  eyebrow: string;
  figures: readonly InlineFigure[];
  /**
   * Quién firma la línea. `violet` = lo dijo la IA (el parte del agente);
   * `brand` = progreso del negocio (el ritmo de la meta).
   */
  accent?: InlineFiguresAccent;
  /** Con `href` la línea entera es un enlace y muestra el chevron. */
  href?: string;
  /** Con `onClick` (y sin `href`) la línea entera es un botón. */
  onClick?: () => void;
  /** Lo que va al final de la línea cuando NO es un enlace (una acción). */
  trailing?: React.ReactNode;
  /** Etiqueta accesible del enlace/botón; por defecto se lee el contenido. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Una línea de cifras con filete a la izquierda: eyebrow + números con su
 * etiqueta, sin caja y sin tinte.
 *
 * **No es una franja con icono y una frase.** Un icono sobre una superficie
 * teñida con prosa dentro es el aviso que pinta igual todo producto con IA.
 * Aquí son datos con la misma tipografía que el marcador de la bandeja —mismo
 * instrumento, otro trabajo— y lo único que dice quién firma es el filete de
 * 2 px: violeta cuando habla la IA, coral cuando habla el negocio.
 *
 * Nació como `AgentDigestLine` en `crm` (el parte del agente en la bandeja de
 * tareas); `commercial` necesitaba el mismo molde para el ritmo de la semana
 * (`PaceLine`) y se promovió aquí (P20 del plan comercial). El de `crm` sigue
 * existiendo como envoltorio fino: aporta los datos y las acciones.
 */
export function InlineFigures({
  eyebrow,
  figures,
  accent = "violet",
  href,
  onClick,
  trailing,
  ariaLabel,
  className,
}: InlineFiguresProps) {
  const body = (
    <>
      <span className="shrink-0 text-[10px] tracking-[0.09em] text-muted-foreground uppercase">
        {eyebrow}
      </span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1">
        {figures.map((figure) => (
          <Figure key={figure.key} figure={figure} />
        ))}
      </span>
    </>
  );

  const shell = cn(
    "flex w-full flex-wrap items-center gap-x-5 gap-y-1.5 rounded-r-lg border-l-2 py-2 pr-3 pl-3 text-left transition-colors",
    ACCENT_CLASSES[accent],
    className,
  );
  const interactive =
    "hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  if (href !== undefined) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cn(shell, interactive, "group")}>
        {body}
        <ChevronRight
          aria-hidden
          className="ml-auto size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        />
      </Link>
    );
  }

  if (onClick !== undefined) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={cn(shell, interactive)}>
        {body}
        <ChevronRight aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className={cn(shell, "cursor-default")} aria-label={ariaLabel}>
      {body}
      {trailing}
    </div>
  );
}

function Figure({ figure }: { figure: InlineFigure }) {
  return (
    <span className="text-xs whitespace-nowrap text-muted-foreground">
      <b
        className={cn(
          "mr-1 text-[14.5px] font-semibold tracking-tight tabular-nums",
          figure.good ? "text-success" : "text-foreground",
        )}
      >
        {figure.value}
      </b>
      {figure.label}
    </span>
  );
}
