import { AnalyticsPageSkeleton } from "@/modules/analytics/ui/AnalyticsPageSkeleton";

/**
 * Carga de ruta de Analíticas: skeleton estructural (header + tabs + KPIs +
 * embudo) para que el render final no salte (LOADING.md §1).
 */
export default function AnalyticsLoading() {
  return <AnalyticsPageSkeleton />;
}
