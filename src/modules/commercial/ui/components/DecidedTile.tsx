"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { CommercialProposalDTO } from "@/modules/commercial/domain/commercial";
import { commercialProposalHref, decidedOnShort } from "@/modules/commercial/domain/proposals";
import { BentoTile } from "@/shared/components/features/bento";

/**
 * «Decididas este mes»: las rutas que ya se tomaron o se descartaron. Las
 * pendientes viven en el panel de navegación del mapa; aquí queda el
 * historial: aprobadas con «Ver qué quedó» si esta sesión tiene el resultado
 * (C6) y descartadas con su motivo, que es lo que Axi recuerda. Sin decididas,
 * no hay ficha.
 */
export function DecidedTile({
  proposals,
  resultIds,
  className,
}: {
  proposals: readonly CommercialProposalDTO[];
  resultIds?: ReadonlySet<string>;
  className?: string;
}) {
  const decided = proposals.filter((proposal) => proposal.status !== "pending");
  if (decided.length === 0) return null;
  return (
    <BentoTile label="Decididas este mes" className={className}>
      <ul className="flex flex-col divide-y divide-border">
        {decided.map((proposal) => {
          const approved = proposal.status === "approved";
          const hasResult = resultIds?.has(proposal.id) ?? false;
          return (
            <li key={proposal.id}>
              <Link
                href={commercialProposalHref(proposal.id)}
                className="group flex min-w-0 flex-col gap-1 rounded-lg py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className={cn("size-1.5 rounded-full", approved ? "bg-success" : "bg-muted-foreground")} />
                  {decidedOnShort(proposal.status, proposal.decided_at)}
                </span>
                <span className="text-[14px] font-medium text-pretty group-hover:underline">{proposal.title}</span>
                {!approved && proposal.reject_reason !== null && proposal.reject_reason !== "" ? (
                  <span className="text-[12.5px] text-muted-foreground">«{proposal.reject_reason.replace(/\.$/, "")}»</span>
                ) : null}
                <span className="inline-flex items-center gap-1 text-[12.5px] font-medium">
                  {approved && hasResult ? "Ver qué quedó" : "Ver"}
                  <ArrowRight aria-hidden className="size-3.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </BentoTile>
  );
}
