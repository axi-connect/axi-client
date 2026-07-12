import { DashboardSkeleton } from "@/modules/dashboard/ui/DashboardSkeleton"

/**
 * Carga de ruta del dashboard: skeleton estructural (banner + tiles + grid de
 * cards) para que el render final no salte (LOADING.md §1).
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />
}
