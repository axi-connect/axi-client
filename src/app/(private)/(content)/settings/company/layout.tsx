import type { ReactNode } from "react";

import { CompanySettingsHeader } from "@/modules/companies/ui/components/settings/CompanySettingsHeader";
import { CompanySettingsNav } from "@/modules/companies/ui/components/settings/CompanySettingsNav";

/**
 * Shell de Mi empresa: cabecera + pestañas por sub-ruta (General · Sucursales ·
 * Medios de pago). Cada pestaña es una página con su propio `loading.tsx`.
 */
export default function CompanySettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <CompanySettingsHeader />
      <CompanySettingsNav />
      {children}
    </div>
  );
}
