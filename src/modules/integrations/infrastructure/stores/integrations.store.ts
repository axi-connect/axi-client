import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import { listIntegrations } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import type {
  IntegrationDTO,
  IntegrationGovernance,
} from "@/modules/integrations/domain/integration";

/**
 * Store del slice integrations (patrón channels.store). Sin WS: el estado
 * cambia por acciones del propio panel o por el polling del historial, así que
 * REST + refetch alcanza.
 */
type IntegrationsStore = {
  loading: boolean;
  items: IntegrationDTO[];
  /** Regla 3 del contrato: el tri-estado lo SIRVE el backend, aquí solo se pinta. */
  governance: IntegrationGovernance | null;
  error: string | null;

  fetchIntegrations: () => Promise<void>;
  upsertIntegration: (integration: IntegrationDTO) => void;
  removeIntegration: (integrationId: string) => void;
};

export const useIntegrationsStore = create<IntegrationsStore>((set) => ({
  loading: true,
  items: [],
  governance: null,
  error: null,

  fetchIntegrations: async () => {
    set({ loading: true, error: null });
    try {
      const res = await listIntegrations();
      set({ items: res.items, governance: res.governance });
    } catch (err) {
      set({ error: errorMessage(err, "No se pudieron cargar las integraciones") });
    } finally {
      set({ loading: false });
    }
  },

  upsertIntegration: (integration) => {
    set((state) => {
      const index = state.items.findIndex((item) => item.id === integration.id);
      if (index === -1) return { items: [...state.items, integration] };
      const items = [...state.items];
      items[index] = integration;
      return { items };
    });
  },

  removeIntegration: (integrationId) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== integrationId) }));
  },
}));
