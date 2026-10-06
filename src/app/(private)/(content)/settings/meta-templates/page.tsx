import type { Metadata } from "next";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MetaTemplatesView } from "@/modules/marketing/ui/MetaTemplatesView";

export const metadata: Metadata = { title: "Plantillas de Meta · Configuración" };

/**
 * F7 (2026-09-28): las plantillas de Meta salen de marketing. Las usan
 * campañas, seguimientos, la bandeja, cobros y documentos, así que son
 * configuración de la plataforma y viven junto a los canales.
 *
 * `?channel=` y `?point=` llegan al volver de la página de una plantilla
 * (hsm-media F3): el canal en que se estaba y la plantilla a señalar.
 */
export default async function SettingsMetaTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Plantillas de Meta"
        description="Las que Meta aprueba para escribirle a un cliente pasadas 24 h desde su último mensaje. Las usan las campañas, los seguimientos, la bandeja, los cobros y los documentos."
      />
      <MetaTemplatesView initialChannelId={params.channel ?? null} pointId={params.point ?? null} />
    </div>
  );
}
