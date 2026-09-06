import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import {
  priceChangedFromError,
  type ActivationConfirmedDTO,
  type ActivationDTO,
  type ActivationQuoteDTO,
} from "@/modules/billing/domain/activation";
import {
  confirmActivation,
  getActivation,
} from "@/modules/billing/infrastructure/services/billing-service.adapter";
import type { SectionStatus } from "@/modules/billing/infrastructure/stores/billing.store";

/**
 * Estado de la tarjeta «Activa tu plan» (Tanda B).
 *
 * Separado del resumen a propósito: el resumen lo carga el banner de mora en
 * todas las páginas del panel, y la activación solo importa en `/billing`
 * mientras el tenant está en prueba. Meterla en el mismo store obligaría a
 * pedirla en cada navegación.
 *
 * `priceChange` es la cotización de hoy que llegó en un 409 al confirmar: la
 * tarjeta la pinta con el antes/después y pide la segunda confirmación (B-D6).
 */
interface ActivationState {
  status: SectionStatus;
  view: ActivationDTO | null;
  error: string | null;
  confirming: boolean;
  priceChange: ActivationQuoteDTO | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * Confirma y devuelve la factura. Con `acceptCurrentPrice` acepta el precio de
   * hoy tras un cambio; sin él, un `price_changed` deja la cotización nueva en
   * `priceChange` y devuelve `null` en vez de lanzar.
   */
  confirm: (acceptCurrentPrice?: boolean) => Promise<ActivationConfirmedDTO | null>;
  onActivationChanged: () => void;
}

let inFlight: Promise<void> | null = null;

export const useActivationStore = create<ActivationState>((set, get) => {
  async function fetchView(): Promise<void> {
    if (inFlight !== null) return inFlight;
    inFlight = (async () => {
      try {
        // Una vista nueva trae su propia `quote_now`: la cotización del 409
        // anterior ya no es lo que rige (auditoría B4-B1).
        set({ status: "ready", view: await getActivation(), error: null, priceChange: null });
      } catch (error) {
        if (get().view === null) set({ status: "error", error: errorMessage(error) });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  return {
    status: "idle",
    view: null,
    error: null,
    confirming: false,
    priceChange: null,

    load: async () => {
      if (get().view !== null) return;
      set({ status: "loading", error: null });
      await fetchView();
    },

    refresh: async () => {
      await fetchView();
    },

    confirm: async (acceptCurrentPrice = false) => {
      const { view, priceChange } = get();
      // Lo que el cliente está viendo: la cotización de hoy tras un cambio, o la
      // de la vista. Si el servidor cotiza otra cosa, responde `price_changed`.
      const shown = priceChange ?? view?.quote_now ?? null;
      set({ confirming: true });
      try {
        const confirmed = await confirmActivation({
          expected_amount_cents: shown?.amount_cents,
          accept_current_price: acceptCurrentPrice || undefined,
        });
        set({ confirming: false, priceChange: null });
        void fetchView();
        return confirmed;
      } catch (error) {
        const changed = priceChangedFromError(error);
        set({ confirming: false, priceChange: changed });
        if (changed !== null) return null;
        throw error;
      }
    },

    onActivationChanged: () => {
      void fetchView();
    },
  };
});
