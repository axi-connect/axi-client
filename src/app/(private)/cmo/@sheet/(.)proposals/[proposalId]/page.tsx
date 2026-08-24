"use client";

import { use } from "react";

import { ProposalSheetRoute } from "@/modules/cmo/ui/ProposalSheetRoute";

/** Rail interceptado de la propuesta: el back del navegador la cierra. */
export default function CmoProposalSheetPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = use(params);
  return <ProposalSheetRoute proposalId={proposalId} closeBehavior="back" />;
}
