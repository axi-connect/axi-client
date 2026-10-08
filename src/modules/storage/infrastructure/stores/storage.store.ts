import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type { LiveQuotaState, QuotaExceededDetails, StorageQuotaStateEvent } from "@/modules/storage/domain/quota";
import type { StorageSummaryDTO } from "@/modules/storage/domain/storage";
import { getStorageSummary } from "@/modules/storage/infrastructure/services/storage-service.adapter";

export type SummaryStatus = "idle" | "loading" | "ready" | "error";

/**
 * Estado del almacenamiento del tenant, en Zustand (architecture §9): lo leen
 * la pestaña de Mi empresa y TODAS las superficies de subida, y lo mueve el
 * evento WS `storage.quota_state`.
 *
 * Dos partes:
 * - `summary`: el resumen completo (`GET /storage/summary`), solo para quien
 *   tiene `storage:read`.
 * - `live`: lo mínimo que necesitan las subidas (¿se puede subir?). Lo
 *   alimentan el resumen, el evento WS y un 507 recibido — así un operador sin
 *   `storage:read` también apaga su clip en cuanto el servidor le dice que no.
 */
type LiveQuota = {
  state: LiveQuotaState;
  blocks_uploads: boolean;
  pct_used: number | null;
};

interface StorageStoreState {
  status: SummaryStatus;
  summary: StorageSummaryDTO | null;
  error: string | null;
  live: LiveQuota;

  /** Carga el resumen si no lo tiene. */
  load: () => Promise<void>;
  /** Recarga silenciosa: conserva las cifras mientras trae las nuevas. */
  refresh: () => Promise<void>;
  /** Reintento desde la vista de error. */
  retry: () => Promise<void>;

  onQuotaState: (event: StorageQuotaStateEvent) => void;
  /** Un 507 de una subida: el servidor ya dijo que no. */
  onQuotaExceeded: (details: QuotaExceededDetails) => void;
  reset: () => void;
}

const UNKNOWN: LiveQuota = { state: "unknown", blocks_uploads: false, pct_used: null };

function liveFromSummary(summary: StorageSummaryDTO): LiveQuota {
  return {
    state: summary.state === "unlimited" ? "ok" : summary.state,
    blocks_uploads: summary.blocks_uploads,
    pct_used: summary.pct_used,
  };
}

/** Petición en vuelo compartida: la pestaña y el vigía del layout no piden dos veces. */
let inFlight: Promise<void> | null = null;

export const useStorageStore = create<StorageStoreState>((set, get) => {
  async function fetchSummary(): Promise<void> {
    if (inFlight !== null) return inFlight;
    inFlight = (async () => {
      try {
        const summary = await getStorageSummary();
        set({ status: "ready", summary, error: null, live: liveFromSummary(summary) });
      } catch (error) {
        // Con cifras en pantalla, un fallo de recarga no las cambia por un error.
        if (get().summary === null) set({ status: "error", error: errorMessage(error, "No pudimos leer tu espacio") });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  return {
    status: "idle",
    summary: null,
    error: null,
    live: UNKNOWN,

    load: async () => {
      if (get().summary !== null || get().status === "loading") return inFlight ?? undefined;
      set({ status: "loading", error: null });
      await fetchSummary();
    },
    refresh: async () => {
      if (get().summary === null) return get().load();
      await fetchSummary();
    },
    retry: async () => {
      set({ status: "loading", error: null });
      await fetchSummary();
    },

    onQuotaState: (event) => {
      set({ live: { state: event.state, blocks_uploads: event.blocks_uploads, pct_used: event.pct_used } });
      // La pestaña abierta refleja el cambio sin recargar la página.
      if (get().summary !== null) void fetchSummary();
    },
    onQuotaExceeded: (details) => {
      // La capacidad del servidor llena no es la cuota del tenant: no se apaga su clip.
      if (details.scope !== "tenant") return;
      set({ live: { state: "full", blocks_uploads: true, pct_used: details.pct_used ?? get().live.pct_used } });
    },
    reset: () => {
      inFlight = null;
      set({ status: "idle", summary: null, error: null, live: UNKNOWN });
    },
  };
});
