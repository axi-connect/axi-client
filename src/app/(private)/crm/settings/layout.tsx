import type { ReactNode } from "react";
import { SettingsNav } from "@/modules/crm/ui/components/settings/SettingsNav";

/** Shell de Configuración del CRM (gate por pestaña en SettingsNav). */
export default function CrmSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[70rem] space-y-4">
      <div className="min-w-0 space-y-1.5">
        <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight md:text-4xl">Configuración</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          Cómo trabaja tu CRM: sus etapas, cuánto insiste el agente, a quién le habla y con qué datos.
        </p>
      </div>
      <SettingsNav />
      {children}
    </div>
  );
}
