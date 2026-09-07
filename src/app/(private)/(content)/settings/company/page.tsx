import { GeneralTab } from "@/modules/companies/ui/components/settings/GeneralTab"

export const metadata = { title: "Mi empresa" }

/** Pestaña General: `GET/PATCH /companies/me` + `PUT /companies/me/schedules`. */
export default function CompanySettingsPage() {
  return <GeneralTab />
}
