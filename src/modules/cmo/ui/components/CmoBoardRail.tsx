"use client";

import { RotateCcw } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ProposalCard } from "./ProposalCard";

interface CmoBoardRailProps {
  proposals: ProposalDTO[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * El panel derecho: solo lo que falta decidir, con el lenguaje de las rutas de
 * /comercial (un panel de cristal con filas: el tipo en tinta, el antetítulo y
 * el título).
 *
 * Es el ÚNICO sitio donde viven las propuestas del informe (dirección A del
 * lienzo 2026-09-28): el hero solo las cuenta y el hilo solo pinta las que
 * nacieron en la conversación. Antes dos de ellas salían a la vez aquí y en el
 * hilo.
 *
 * El estado vacío NO se disimula: un tenant sin propuestas pendientes está
 * **al día**, y decírselo así es información útil.
 */
export function CmoBoardRail({ proposals, loading, error, onRetry }: CmoBoardRailProps) {
  return (
    <aside aria-label="Tablero de Axel" className="flex w-[340px] flex-none flex-col bg-secondary/40">
      {/* Scroller de BLOQUE, no `flex flex-col`, y esto no es cosmético: el
          tamaño mínimo automático de un hijo que sea contenedor de scroll es 0
          (CSS Box Sizing), y la `<section>` de abajo lo es por su
          `overflow-hidden`. Como hijo directo de un scroller flex era encogible
          hasta 0, así que flex la aplastaba a la altura disponible y su
          `overflow-hidden` recortaba las tarjetas. En bloque, la altura de los
          hijos es su contenido y el scroll aparece. Ver DESIGN-SYSTEM §4.2. */}
      <div className="sidebar-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
        <section className="glass-overlay overflow-hidden rounded-3xl p-4">
          <header className="flex items-baseline gap-2 px-0.5">
            <h2 className="font-heading text-lg font-bold tracking-tight">Por decidir</h2>
            {proposals !== null && proposals.length > 0 ? (
              <span className="text-[13px] text-muted-foreground tabular-nums">{proposals.length}</span>
            ) : null}
          </header>
          <p className="mt-0.5 px-0.5 text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Las prepara Axel
          </p>

          <div className={cn("mt-3 flex flex-col gap-2", loading && "opacity-60")}>
            {error !== null ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-[13px] text-muted-foreground">{error}</p>
                <Button variant="glass" size="sm" onClick={onRetry}>
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Reintentar
                </Button>
              </div>
            ) : proposals === null && loading ? (
              <>
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </>
            ) : proposals !== null && proposals.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Estás al día.</p>
            ) : (
              (proposals ?? []).map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} compact />)
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
