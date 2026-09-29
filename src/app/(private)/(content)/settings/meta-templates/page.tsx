import type { Metadata } from "next";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MetaTemplatesView } from "@/modules/marketing/ui/MetaTemplatesView";

export const metadata: Metadata = { title: "Plantillas de Meta · Configuración" };

/**
 * F7 (2026-09-28): las plantillas de Meta salen de marketing. Las usan
 * campañas, seguimientos, la bandeja, cobros y documentos, así que son
 * configuración de la plataforma y viven junto a los canales.
 */
export default function SettingsMetaTemplatesPage() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Plantillas de Meta"
        description="Las que Meta aprueba para escribirle a un cliente pasadas 24 h desde su último mensaje. Las usan las campañas, los seguimientos, la bandeja, los cobros y los documentos."
      />
      <MetaTemplatesView />
    </div>
  );
}
