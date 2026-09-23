"use client";

import { RotateCcw } from "lucide-react";

import type { CommercialProposalDTO } from "@/modules/commercial/domain/commercial";
import { LEARNING_PROPOSALS_MESSAGE, NO_APPROVE_PERMISSION_MESSAGE, NO_PROPOSALS_MESSAGE } from "@/modules/commercial/domain/copy";
import { commercialProposalHref } from "@/modules/commercial/domain/proposals";
import { AssistantMark } from "@/shared/components/features/assistant";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ActionRow } from "./ActionRow";

export interface ActionListProps {
  /** `undefined` = cargando (primera vez). Una lista vacía de verdad dice «Estás al día…». */
  proposals?: readonly CommercialProposalDTO[];
  error?: string | null;
  onRetry?: () => void;
  learning?: boolean;
  canApprove?: boolean;
  onApprove?: (id: string) => Promise<void>;
}

/**
 * «AXI PROPONE»: lo que la IA sugiere para acelerar la ruta. Es la ÚNICA
 * superficie del módulo con violeta (D4: axi propone, el dueño aprueba), y la
 * firma es `AssistantMark`, como en todo el producto.
 *
 * Sin permiso de aprobar, las filas enlazan al detalle de solo lectura y una
 * línea dice a quién pedírselo (vista «sin permiso» del mockup).
 */
export function ActionList({ proposals, error = null, onRetry, learning = false, canApprove = false, onApprove }: ActionListProps) {
  const empty = proposals !== undefined && proposals.length === 0;
  const hasPending = proposals?.some((proposal) => proposal.status === "pending") ?? false;
  return (
    <section aria-labelledby="commercial-actions" className="overflow-hidden rounded-2xl border border-border bg-background shadow-float">
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        <AssistantMark size="sm" />
        <h2 id="commercial-actions" className="text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Axi propone
        </h2>
      </header>
      {proposals === undefined ? (
        error !== null ? (
          <div className="flex flex-wrap items-center gap-3 px-4 pt-2 pb-4">
            <p className="text-[14px] text-muted-foreground">{error}</p>
            {onRetry !== undefined ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw aria-hidden className="size-4" />
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : (
          <div role="status" aria-label="Cargando lo que Axi propone" className="space-y-2 px-4 pt-2 pb-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )
      ) : empty ? (
        <p className="px-4 pt-2 pb-4 text-[14px] text-muted-foreground">{learning ? LEARNING_PROPOSALS_MESSAGE : NO_PROPOSALS_MESSAGE}</p>
      ) : (
        <ul className="grouped-list rounded-none">
          {proposals.map((proposal) => (
            <ActionRow
              key={proposal.id}
              proposal={proposal}
              href={commercialProposalHref(proposal.id)}
              canApprove={canApprove}
              onApprove={onApprove}
            />
          ))}
          {!canApprove && hasPending ? (
            <li className="grouped-row px-4 py-3 text-[12.5px] text-muted-foreground">{NO_APPROVE_PERMISSION_MESSAGE}</li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
