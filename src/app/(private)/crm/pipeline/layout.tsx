import type { ReactNode } from "react";

/**
 * Segmento del pipeline: @sheet = rail derecho del deal (ruta interceptada
 * /crm/pipeline/deal/[dealId]); @form = modal de nueva oportunidad.
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
    <div className="flex h-full w-full min-h-0 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      {sheet}
      {form}
    </div>
  );
}
