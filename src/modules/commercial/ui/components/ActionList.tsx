"use client";

import type { CommercialProposalDTO } from "@/modules/commercial/domain/commercial";
import { LEARNING_PROPOSALS_MESSAGE, NO_PROPOSALS_MESSAGE } from "@/modules/commercial/domain/copy";
import { AssistantMark } from "@/shared/components/features/assistant";
import { ActionRow } from "./ActionRow";

/**
 * «AXI PROPONE»: lo que la IA sugiere para acelerar la ruta. Es la ÚNICA
 * superficie del módulo con violeta (D4: axi propone, el dueño aprueba), y la
 * firma es `AssistantMark`, como en todo el producto.
 *
 * En F3 la lista nace vacía: `GET /commercial/proposals` y los botones
 * Aprobar/Ver llegan en F6. El hueco ya dice lo que va a haber aquí.
 */
export function ActionList({ proposals, learning = false }: { proposals: readonly CommercialProposalDTO[]; learning?: boolean }) {
  return (
    <section aria-labelledby="commercial-actions" className="overflow-hidden rounded-2xl border border-border bg-background shadow-float">
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        <AssistantMark size="sm" />
        <h2 id="commercial-actions" className="text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Axi propone
        </h2>
      </header>
      {proposals.length === 0 ? (
        <p className="px-4 pt-2 pb-4 text-[14px] text-muted-foreground">
          {learning ? LEARNING_PROPOSALS_MESSAGE : NO_PROPOSALS_MESSAGE}
        </p>
      ) : (
        <ul className="grouped-list rounded-none">
          {proposals.map((proposal) => (
            <ActionRow key={proposal.id} proposal={proposal} />
          ))}
        </ul>
      )}
    </section>
  );
}
