import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  BillingInvoiceIssuedEvent,
  BillingPaymentApprovedEvent,
} from "@/core/realtime/events";
import type { BillingSummaryDTO } from "@/modules/billing/domain/account";
import { getBillingSummary } from "@/modules/billing/infrastructure/services/billing-service.adapter";

export type SectionStatus = "idle" | "loading" | "ready" | "error";

/**
 * Estado del resumen de facturación.
 *
 * Zustand y no TanStack Query: la capa de datos del tenant no tiene caché global
 * (architecture §9), y este estado tiene que sobrevivir a la navegación entre las
 * vistas de la sección y sincronizarse con los eventos WS.
 */
interface BillingState {
  status: SectionStatus;
  summary: BillingSummaryDTO | null;
  error: string | null;

  /**
   * Carga el resumen **si no lo tiene ya**. Es lo que llama el banner de mora,
   * que monta en TODAS las páginas del panel: pedirlo de nuevo en cada
   * navegación sería una petición por pantalla para un dato que cambia por WS.
   */
  load: () => Promise<void>;
  /** Recarga silenciosa: no vacía la pantalla mientras trae el dato nuevo. */
  refresh: () => Promise<void>;

  onInvoiceIssued: (payload: BillingInvoiceIssuedEvent) => void;
  onPaymentApproved: (payload: BillingPaymentApprovedEvent) => void;
  onPastDue: () => void;
}

/**
 * Petición en vuelo, a nivel de módulo y NO en el estado.
 *
 * El banner de mora vive en el layout privado y la vista de resumen en su
 * página: al entrar a `/billing` los dos montan casi a la vez y pedirían el
 * resumen dos veces. Compartir la promesa deja una sola petición sin que
 * ninguno de los dos tenga que saber del otro.
 */
let inFlight: Promise<void> | null = null;

export const useBillingStore = create<BillingState>((set, get) => {
  async function fetchSummary(): Promise<void> {
    if (inFlight !== null) return inFlight;

    inFlight = (async () => {
      try {
        set({ status: "ready", summary: await getBillingSummary(), error: null });
      } catch (error) {
        // Un fallo NO tumba una pantalla que ya tiene datos: el usuario está
        // mirando cifras válidas y cambiárselas por un error es peor que
        // servirle un dato de hace unos segundos.
        if (get().summary === null) set({ status: "error", error: errorMessage(error) });
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

    load: async () => {
      if (get().summary !== null) return;
      set({ status: "loading", error: null });
      await fetchSummary();
    },

    refresh: async () => {
      await fetchSummary();
    },

    /**
     * Se emitió la factura del ciclo: cambia el saldo y el número de abiertas,
     * así que se re-consulta en vez de recalcular a mano. El payload no trae el
     * saldo agregado y deducirlo sumando sería inventar el dato.
     */
    onInvoiceIssued: () => {
      void get().refresh();
    },

    /**
     * Se aplicó un pago. También se re-consulta: el evento trae el estado de LA
     * factura, no el saldo de la cuenta.
     */
    onPaymentApproved: () => {
      void get().refresh();
    },

    /**
     * La cuenta pasó a mora. El payload solo trae `company_id`, así que el
     * estado nuevo (y con él la cuenta atrás) sale del resumen.
     */
    onPastDue: () => {
      void get().refresh();
    },
  };
});
