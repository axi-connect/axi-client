import type { Metadata } from "next";

import { http } from "@/core/services/http";
import type { ProspectingStatsDTO } from "@/modules/prospecting/domain/lead";
import { LeadsInboxView } from "@/modules/prospecting/ui/LeadsInboxView";

export const metadata: Metadata = {
  title: "Captación",
  description: "Prospectos descubiertos y a la espera de entrar a tu CRM.",
};

/** El embudo se precarga en el servidor: la cifra grande no debe parpadear. */
async function loadStats(): Promise<ProspectingStatsDTO> {
  try {
    return await http.get<ProspectingStatsDTO>("/prospecting/stats");
  } catch {
    // Un fallo del resumen no puede dejar sin bandeja: se pinta en ceros y la
    // tabla, que es lo que importa, carga igual desde el cliente.
    return {
      discovered: 0,
      qualified: 0,
      quarantined: 0,
      promoted: 0,
      suppressed: 0,
    };
  }
}

export default async function LeadsPage() {
  return <LeadsInboxView initialStats={await loadStats()} />;
}
