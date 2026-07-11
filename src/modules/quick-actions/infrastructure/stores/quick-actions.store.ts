import { create } from "zustand";
import type { QuickActionDTO } from "@/modules/quick-actions/domain/quick-action";
import { listQuickActions } from "@/modules/quick-actions/infrastructure/services/quick-action-service.adapter";

/**
 * Lista de acciones ACTIVAS cacheada para el menú ⚡ del inbox (cross-slice:
 * inbox la consume como contrato público). La tabla de settings NO usa este
 * store (usa usePaginatedList); settings llama `invalidate()` tras mutar.
 */
type QuickActionsStore = {
  actions: QuickActionDTO[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetchActive: () => Promise<void>;
  invalidate: () => void;
};

export const useQuickActionsStore = create<QuickActionsStore>((set, get) => ({
  actions: [],
  loaded: false,
  loading: false,
  error: null,

  fetchActive: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const res = await listQuickActions({ enabled: true, page: 1, page_size: 100 });
      set({ actions: res.data, loaded: true });
    } catch {
      set({ error: "No se pudieron cargar las acciones rápidas" });
    } finally {
      set({ loading: false });
    }
  },

  invalidate: () => set({ loaded: false, actions: [] }),
}));
