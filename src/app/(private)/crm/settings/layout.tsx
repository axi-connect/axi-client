import type { ReactNode } from "react";
import { SettingsNav } from "@/modules/crm/ui/components/settings/SettingsNav";

/** Shell de Configuración del CRM (gate crm:manage en SettingsNav). */
export default function CrmSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Pipelines, etiquetas y segmentos de tu CRM.
        </p>
      </div>
      <SettingsNav />
      {children}
    </div>
  );
}
