import { BrandLoader } from "@/shared/components/ui/brand-loader"

/**
 * Carga de ruta del dashboard. El dashboard aún no tiene estructura estable,
 * así que usa el loader de marca; cuando la tenga, migrar a un skeleton
 * estructural (ver docs/design/LOADING.md).
 */
export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-100px)] items-center justify-center">
      <BrandLoader size="lg" />
    </div>
  )
}
