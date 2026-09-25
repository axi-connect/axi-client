import { QualityTabs } from "@/modules/platform/ui/features/quality/QualityTabs";

/**
 * Layout de la sección Calidad: título + tabs por segmento de ruta (D11)
 * persisten entre sub-vistas. Terminología de UI: "Ejecuciones" (nunca
 * "Corridas"); ver docs/plans/quality_upgrade_plan.md.
 */
export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
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
