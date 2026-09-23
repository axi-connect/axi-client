"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { CommercialProposalDTO } from "@/modules/commercial/domain/commercial";
import { StatusBadge } from "@/shared/components/features/status-badge";
import type { StatusMap } from "@/shared/components/features/status-badge/types";

const PROPOSAL_BADGES: StatusMap = {
  approved: { label: "Aprobada", tone: "success" },
  rejected: { label: "Descartada", tone: "neutral" },
  expired: { label: "Vencida", tone: "neutral" },
};

/**
 * Una acción propuesta: título, el titular en violeta («+6 ventas estimadas ·
 * cubre el 38 % de lo que falta») y la razón. La fila es un enlace al detalle
 * (`/comercial/acciones/[id]`, F6); Aprobar y Rechazar llegan con él.
 */
export function ActionRow({ proposal }: { proposal: CommercialProposalDTO }) {
  const settled = proposal.status !== "pending";
  return (
    <li className="grouped-row group">
      <Link
        href={`/comercial/acciones/${proposal.id}`}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-px px-4 py-3 transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[settled=true]:opacity-70"
        data-settled={settled}
      >
        {settled ? (
          <span className="text-[12px]">
            <StatusBadge status={proposal.status} map={PROPOSAL_BADGES} appearance="dot" />
          </span>
        ) : null}
        <span className="row-span-3 flex items-center gap-3 self-center text-[12px] text-muted-foreground">
          <ChevronRight
            aria-hidden
            className="size-4 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          />
        </span>
        <span className="text-[15px] font-medium text-foreground">{proposal.title}</span>
        {proposal.headline !== null && !settled ? (
          <span className="text-[13.5px] font-medium text-accent-violet tabular-nums">{proposal.headline}</span>
        ) : null}
        <span className="col-start-1 text-[12.5px] text-muted-foreground">{proposal.rationale}</span>
      </Link>
    </li>
  );
}
