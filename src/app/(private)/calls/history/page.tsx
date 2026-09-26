import { Suspense } from "react";
import { TableSkeleton } from "@/shared/components/features/loading";
import { CallsHistoryView } from "@/modules/calls/ui/CallsHistoryView";

// `useSearchParams` (el filtro `?outcome=` que llega del Monitoreo) exige su
// frontera de Suspense para no tumbar el render estático de la ruta.
export default function CallsHistoryPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <CallsHistoryView />
    </Suspense>
  );
}
