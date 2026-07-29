"use client";

import { use } from "react";
import { DealDetailRoute } from "@/modules/crm/ui/DealDetailRoute";

/** Rail interceptado del deal: URL compartible, el back del navegador cierra. */
export default function CrmDealSheetPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = use(params);
  return <DealDetailRoute dealId={dealId} closeBehavior="back" />;
}
