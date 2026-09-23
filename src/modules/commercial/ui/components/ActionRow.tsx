"use client";

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
 * cubre el 38 % de lo que falta») y la razón. El enlace al detalle
 * (`/comercial/acciones/[id]`), Aprobar y Rechazar llegan en F6 con la página;
 * hasta entonces la fila es estática.
 */
export function ActionRow({ proposal }: { proposal: CommercialProposalDTO }) {
  const settled = proposal.status !== "pending";
  return (
    <li className="grouped-row grid grid-cols-[minmax(0,1fr)] gap-y-px px-4 py-3 data-[settled=true]:opacity-70" data-settled={settled}>
      {settled ? (
        <span className="text-[12px]">
          <StatusBadge status={proposal.status} map={PROPOSAL_BADGES} appearance="dot" />
        </span>
      ) : null}
      <span className="text-[15px] font-medium text-foreground">{proposal.title}</span>
      {proposal.headline !== null && !settled ? (
        <span className="text-[13.5px] font-medium text-accent-violet tabular-nums">{proposal.headline}</span>
      ) : null}
      <span className="text-[12.5px] text-muted-foreground">{proposal.rationale}</span>
    </li>
  );
}
