import type { Metadata } from "next";
import { MarketingHeader } from "@/modules/marketing/public";
import { MarketingSettingsNav } from "@/modules/marketing/ui/components/MarketingSettingsNav";

export const metadata: Metadata = { title: "Configuración · Marketing" };

/**
 * Configuración de marketing: el encabezado del módulo (con su navegación) y,
 * debajo, las cuatro sub-secciones. El marco vive aquí y no en cada vista para
 * que no parpadee al pasar de una a otra.
 */
export default function MarketingSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MarketingHeader
        title="Configuración"
        description="Los límites que protegen a tus clientes y a tus números de WhatsApp, tus mensajes y tus plantillas de Meta."
      />
      <MarketingSettingsNav />
      {children}
    </div>
  );
}
