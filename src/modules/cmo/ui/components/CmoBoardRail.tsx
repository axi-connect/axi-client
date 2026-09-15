"use client";

import { Inbox } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ProposalCard } from "./ProposalCard";

interface CmoBoardRailProps {
  proposals: ProposalDTO[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * El rail derecho: solo lo que falta decidir.
 *
 * Antes llevaba también «La lectura de Axel» (el resumen del informe y sus
 * cifras) y el enlace a ajustes. El resumen ya es el titular del hero y sus
 * cifras viajan con él como chips; ajustes es un icono en la esquina del campo.
 * Lo que queda es la bandeja, con su contador.
 *
 * El estado vacío NO se disimula: un tenant sin propuestas pendientes está
 * **al día**, y decírselo así es información útil.
 */
export function CmoBoardRail({ proposals, loading, error, onRetry }: CmoBoardRailProps) {
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
          `overflow-hidden` recortaba las tarjetas. En bloque, la altura de los
          hijos es su contenido y el scroll aparece. Ver DESIGN-SYSTEM §4.2. */}
      <div className="sidebar-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
        <section className="overflow-hidden rounded-lg border border-border bg-background">
          <header className="flex items-center gap-2 px-3.5 pt-3">
            <Inbox className="size-3.5 text-accent-violet" aria-hidden="true" />
            <h2 className="font-heading text-[12.5px] font-bold">Por decidir</h2>
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
              <p className="text-xs text-muted-foreground">Estás al día.</p>
            ) : (
              (proposals ?? []).map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} compact />
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
