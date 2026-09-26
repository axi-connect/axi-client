import { http } from "@/core/services/http";
import type { ProspectingStatsDTO } from "@/modules/prospecting/domain/lead";
import { CaptureStatsSeed } from "@/modules/prospecting/ui/components/CaptureStatsSeed";

/**
 * Marco de captación: precarga en el servidor las cifras del embudo (el
 * contador de la pestaña «Bandeja» y el embudo no deben parpadear) y las siembra
 * para todas sus secciones. La cabecera y la navegación las pinta cada vista con
 * `CaptureHeader`, como el resto de marketing.
 */
async function loadStats(): Promise<ProspectingStatsDTO | null> {
  try {
    return await http.get<ProspectingStatsDTO>("/prospecting/stats");
  } catch {
    // Sin cifras la bandeja carga igual desde el cliente; el embudo espera a su recarga.
    return null;
  }
}

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CaptureStatsSeed stats={await loadStats()}>
      <div className="min-w-0">{children}</div>
    </CaptureStatsSeed>
  );
}
