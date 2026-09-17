import { FeaturesTab } from "@/modules/companies/ui/components/settings/FeaturesTab"

export const metadata = { title: "Funciones · Mi empresa" }

/** Pestaña «Funciones» de Mi empresa (`GET /me/features`, `PUT /features/:code`). */
export default function CompanyFeaturesPage() {
  return <FeaturesTab />
}
