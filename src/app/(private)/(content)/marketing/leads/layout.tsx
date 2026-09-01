import { LeadsNav } from "@/modules/prospecting/ui/components/LeadsNav";

/**
 * Shell de la sección de captación.
 *
 * Las pestañas viven aquí y no en cada vista para que no parpadeen al navegar
 * entre Bandeja y Calidad: son el marco, no contenido de la página.
 */
export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <LeadsNav />
      <div className="mt-4">{children}</div>
    </div>
  );
}
