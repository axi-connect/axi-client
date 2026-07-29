"use client";

import { use } from "react";
import { PipelineView } from "@/modules/crm/ui/PipelineView";

/** Hard-nav (refresh, deep-link de notificación): board + rail inline. */
export default function CrmDealHardNavPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = use(params);
  return <PipelineView initialDealId={dealId} />;
}
