import { QualityTabs } from "@/modules/platform/ui/features/quality/QualityTabs";

/**
 * Layout de la sección Calidad: título + tabs por segmento de ruta (D11)
 * persisten entre sub-vistas. Terminología de UI: "Ejecuciones" (nunca
 * "Corridas"); ver docs/plans/quality_upgrade_plan.md.
 *
 * Shell de SECCIÓN: no declara el modo de scroll, lo propaga con :has()
 * (DESIGN-SYSTEM §4.2). El simulacro se marca `data-app-view` en su layout.
 */
export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 app-fit:has-[[data-app-view]]:flex app-fit:has-[[data-app-view]]:min-h-0 app-fit:has-[[data-app-view]]:flex-1 app-fit:has-[[data-app-view]]:flex-col">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Calidad</h1>
        <p className="text-sm text-muted-foreground">
          QA simulado, simulacro interactivo, pruebas de estrés y diagnóstico forense
        </p>
      </header>
      <QualityTabs />
      {children}
    </div>
  );
}
