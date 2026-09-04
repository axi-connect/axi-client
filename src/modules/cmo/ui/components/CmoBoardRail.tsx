"use client";

import Link from "next/link";
import { BookOpen, Inbox, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { BriefingDTO, ProposalDTO } from "@/modules/cmo/domain/cmo";
import { briefingDayLabel, toneClasses } from "@/modules/cmo/domain/proposal-labels";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ProposalCard } from "./ProposalCard";

interface CmoBoardRailProps {
  proposals: ProposalDTO[] | null;
  briefing: BriefingDTO | null;
  loading: boolean;
  /**
   * Carga del briefing, aparte de la de las propuestas: los cuatro fetch del
   * store fallan y terminan por separado, y decir «todavía no ha revisado tu
   * negocio» mientras la respuesta viaja sería afirmar algo que no se sabe.
   */
  briefingLoading: boolean;
  /** Fallo al cargar el briefing: decir «todavía no ha revisado tu negocio»
   *  ante un 500 era una afirmación falsa (F1). */
  briefingError: string | null;
  onRetryBriefing: () => void;
  error: string | null;
  onRetry: () => void;
}

/**
 * El rail derecho: lo que Axel ya vio y ya propuso.
 *
 * Es el tablero, degradado a rail a propósito — la conversación es la columna
 * vertebral y esto la acompaña. Lleva solo lo que se decide o se mira de un
 * vistazo; el detalle vive en el sheet de la propuesta.
 *
 * El estado vacío NO se disimula: un tenant sin propuestas pendientes está
 * **al día**, y decírselo así es información útil. Un "no hay datos" sugeriría
 * que algo falta.
 */
export function CmoBoardRail({
  proposals,
  briefing,
  loading,
  briefingLoading,
  briefingError,
  onRetryBriefing,
  error,
  onRetry,
}: CmoBoardRailProps) {
  return (
    <aside
      aria-label="Tablero de Axel"
      className="flex w-[316px] flex-none flex-col border-l border-border bg-secondary/40"
    >
      {/* Scroller de BLOQUE, no `flex flex-col`, y esto no es cosmético: el
          tamaño mínimo automático de un hijo que sea contenedor de scroll es 0
          (CSS Box Sizing), y la `<section>` de abajo lo es por su
          `overflow-hidden`. Como hijo directo de un scroller flex era encogible
          hasta 0, así que flex la aplastaba a la altura disponible y su
          `overflow-hidden` recortaba las tarjetas: este scroller nunca
          desbordaba y las propuestas de más quedaban inalcanzables. En bloque, la
          altura de los hijos es su contenido y el scroll aparece.
          Ver DESIGN-SYSTEM §4.2. */}
      <div className="sidebar-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
        <section className="overflow-hidden rounded-lg border border-border bg-background">
          <header className="flex items-center gap-2 px-3.5 pt-3">
            <Inbox className="size-3.5 text-accent-violet" aria-hidden="true" />
            <h2 className="font-heading text-[12.5px] font-bold">Propuestas por decidir</h2>
            {proposals !== null && proposals.length > 0 ? (
              <span className="ml-auto rounded-full border border-border/60 bg-secondary px-1.5 text-[10.5px] font-bold text-muted-foreground tabular-nums">
                {proposals.length}
              </span>
            ) : null}
          </header>

          <div className={cn("flex flex-col gap-2 p-3.5", loading && "opacity-60")}>
            {error !== null ? (
              <div className="text-xs">
                <p className="text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-1 font-semibold underline underline-offset-2"
                >
                  Reintentar
                </button>
              </div>
            ) : proposals === null && loading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : proposals !== null && proposals.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Estás al día: no tienes nada pendiente por decidir. Cuando Axel encuentre algo
                que valga la pena, aparece aquí.
              </p>
            ) : (
              (proposals ?? []).map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} compact />
              ))
            )}
          </div>
        </section>
      </div>

      {/* LA LECTURA DE AXEL — el detalle del briefing, anclado al pie y fuera del
          scroll del rail. Aquí bajaron los `highlights` que antes se pintaban dos
          veces: en la tarjeta del briefing y en una sección de este mismo rail.
          El titular del día vive en el hero; esto es la letra pequeña. */}
      <div className="flex-none border-t border-border p-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-accent-violet" aria-hidden="true" />
          <h2 className="text-[11px] font-bold tracking-wide text-accent-violet">
            La lectura de Axel
          </h2>
          {briefing !== null ? (
            <span className="ml-auto text-[10px] text-muted-foreground/70">
              {briefingDayLabel(briefing.date_local)}
            </span>
          ) : null}
        </div>

        {briefing === null && briefingError !== null ? (
          <div className="mt-2 text-[11.5px]">
            <p className="text-destructive">{briefingError}</p>
            <button
              type="button"
              onClick={onRetryBriefing}
              className="mt-1 font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        ) : briefing === null && briefingLoading ? (
          <div className="mt-2 flex flex-col gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : briefing === null ? (
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            Todavía no ha revisado tu negocio. Cuando salga su primer informe, aquí queda el
            resumen del día.
          </p>
        ) : (
          <>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
              {briefing.summary}
            </p>
            {briefing.highlights.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {briefing.highlights.map((highlight) => (
                  <span
                    key={`${highlight.label}-${highlight.detail}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
                      "text-[10.5px] font-medium",
                      toneClasses(highlight.tone),
                    )}
                  >
                    {highlight.label}
                    <span className="tabular-nums opacity-80">{highlight.detail}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </>
        )}

        <Link
          href="/cmo/settings"
          className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookOpen className="size-3.5" aria-hidden="true" />
          Tus directrices y ajustes
        </Link>
      </div>
    </aside>
  );
}
