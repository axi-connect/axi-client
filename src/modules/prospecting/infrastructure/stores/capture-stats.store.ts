import { create } from "zustand";

import type { ProspectingStatsDTO } from "../../domain/lead";
import { getProspectingStats } from "../services/prospecting-service.adapter";

/**
 * Las cifras del embudo de captación, compartidas por la pestaña «Bandeja» (su
 * contador) y el embudo de la bandeja.
 *
 * Las siembra el layout de captación con lo que precargó en el servidor, así que
 * la cifra no parpadea al entrar; después las mueve la bandeja al promover (se
 * estima: mueve exactamente dos pasos) o las recarga al borrar (mueve varios y
 * restar a mano acabaría en un embudo que no suma).
 */
type CaptureStatsState = {
  stats: ProspectingStatsDTO | null;
  seed: (stats: ProspectingStatsDTO) => void;
  /** Tras promover N: salen de la cuarentena y entran al CRM. */
  promoted: (count: number) => void;
  /** Tras borrar: se piden de nuevo. Un fallo deja las cifras que había. */
  reload: () => Promise<void>;
};

export const useCaptureStats = create<CaptureStatsState>((set) => ({
  stats: null,
  seed: (stats) => set({ stats }),
  promoted: (count) =>
    set((state) =>
      state.stats === null
        ? state
        : {
            stats: {
              ...state.stats,
              promoted: state.stats.promoted + count,
              quarantined: Math.max(0, state.stats.quarantined - count),
            },
          },
    ),
  reload: async () => {
    try {
      set({ stats: await getProspectingStats() });
    } catch {
      // Sin cifras nuevas, las de antes siguen siendo mejores que un hueco.
    }
  },
}));
