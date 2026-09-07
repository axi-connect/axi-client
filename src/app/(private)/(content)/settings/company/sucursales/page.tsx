import { BranchesTab } from "@/modules/companies/ui/components/branches/BranchesTab"

export const metadata = { title: "Sucursales · Mi empresa" }

/** Pestaña «Sucursales» (`/companies/me/branches` + `GET /geo/search`). */
export default function CompanyBranchesPage() {
  return <BranchesTab />
}
