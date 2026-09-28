"use client";

import { Suspense } from "react";
import { PipelineView } from "@/modules/crm/ui/PipelineView";
import { CreateDealModal } from "@/modules/crm/ui/forms/CreateDealModal";

/**
 * Ruta REAL de «Nueva oportunidad». `(.)create` solo intercepta cuando se
 * navega DESDE /crm/pipeline; desde el 360 («Nueva» en Oportunidades) o al
 * recargar la URL no intercepta y, sin esta página, caía en un 404 (QA DQ-H2).
 * Pinta el board detrás y el mismo modal encima, igual que `deal/[dealId]`.
 */
export default function CrmDealCreatePage() {
  return (
    <>
      <PipelineView />
      <Suspense fallback={null}>
        <CreateDealModal />
      </Suspense>
    </>
  );
}
