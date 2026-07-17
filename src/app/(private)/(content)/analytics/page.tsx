import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsView } from "@/modules/analytics/ui/AnalyticsView";
import { AnalyticsPageSkeleton } from "@/modules/analytics/ui/AnalyticsPageSkeleton";

export const metadata: Metadata = { title: "Analíticas" };

/** La vista usa `useSearchParams` (tabs/período en URL) → Suspense (§14). */
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalyticsView />
    </Suspense>
  );
}
