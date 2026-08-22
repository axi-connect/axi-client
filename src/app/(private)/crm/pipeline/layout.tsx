import type { ReactNode } from "react";

/**
 * Segmento del pipeline: @sheet = rail derecho del deal (ruta interceptada
 * /crm/pipeline/deal/[dealId]); @form = modal de nueva oportunidad.
 *
 * Única vista de APLICACIÓN del CRM: el kanban se topa al viewport y scrollean
 * sus columnas, así que es ella —y no el shell de sección— la que declara
 * `data-app-view` (DESIGN-SYSTEM §4.2). `flex-1` en vez de `h-full`: un
 * porcentaje contra un padre de altura `auto` resuelve a `auto`.
 */
export default function CrmPipelineLayout({
  children,
  sheet,
  form,
}: {
  children: ReactNode;
  sheet: ReactNode;
  form: ReactNode;
}) {
  return (
    <div data-app-view className="flex min-h-0 w-full flex-1 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
      {form}
    </div>
  );
}
