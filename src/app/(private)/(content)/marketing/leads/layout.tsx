import { MarketingNav } from "@/modules/marketing/public";
import { LeadsNav } from "@/modules/prospecting/ui/components/LeadsNav";

/**
 * Shell de la sección de captación.
 *
 * Las pestañas viven aquí y no en cada vista para que no parpadeen al navegar
 * entre Bandeja y Calidad: son el marco, no contenido de la página. Arriba, la
 * barra del módulo de marketing (Captación es una de sus secciones); debajo,
 * las de captación.
 */
export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <MarketingNav />
      <LeadsNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
