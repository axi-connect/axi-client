"use client";

import { use } from "react";

import { ProposalSheetRoute } from "@/modules/cmo/ui/ProposalSheetRoute";

/**
 * Navegación DURA (enlace compartido, refresco): la misma propuesta como página
 * completa. `closeBehavior="push"` porque en una pestaña nueva no hay historial
 * al que volver, y un botón de cerrar que no hace nada es peor que no tenerlo.
 */
export default function CmoProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = use(params);
  return (
    <div className="mx-auto flex h-full w-full max-w-[580px] flex-col">
      <ProposalSheetRoute proposalId={proposalId} closeBehavior="push" />
    </div>
  );
}
