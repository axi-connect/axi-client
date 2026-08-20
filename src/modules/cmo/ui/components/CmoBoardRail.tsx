"use client";

import Link from "next/link";
import { BookOpen, Inbox, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { BriefingDTO, ProposalDTO } from "@/modules/cmo/domain/cmo";
import { toneClasses } from "@/modules/cmo/domain/proposal-labels";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ProposalCard } from "./ProposalCard";

interface CmoBoardRailProps {
  proposals: ProposalDTO[] | null;
  briefing: BriefingDTO | null;
  loading: boolean;
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
  error,
  onRetry,
}: CmoBoardRailProps) {
  return (
    <aside
      aria-label="Tablero de Axel"
      className="flex w-[316px] flex-none flex-col border-l border-border bg-secondary/40"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
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

        {briefing !== null && briefing.highlights.length > 0 ? (
          <section className="overflow-hidden rounded-lg border border-border bg-background">
            <header className="flex items-center gap-2 px-3.5 pt-3">
              <Sparkles className="size-3.5 text-accent-violet" aria-hidden="true" />
              <h2 className="font-heading text-[12.5px] font-bold">Cómo va el negocio</h2>
            </header>
            <div className="flex flex-col gap-2 p-3.5">
              {briefing.highlights.map((highlight) => (
                <div
                  key={`${highlight.label}-${highlight.detail}`}
                  className="flex items-baseline gap-2 text-xs"
                >
                  <span className="flex-1 text-muted-foreground">{highlight.label}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                      toneClasses(highlight.tone),
                    )}
                  >
                    {highlight.detail}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex-none border-t border-border p-3.5">
        <Link
          href="/cmo/settings"
          className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookOpen className="size-3.5" aria-hidden="true" />
          Tus directrices y ajustes
        </Link>
      </div>
    </aside>
  );
}
