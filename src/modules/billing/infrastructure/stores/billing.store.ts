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

  load: () => Promise<void>;
  /** Recarga silenciosa: no vacía la pantalla mientras trae el dato nuevo. */
  refresh: () => Promise<void>;

  onInvoiceIssued: (payload: BillingInvoiceIssuedEvent) => void;
  onPaymentApproved: (payload: BillingPaymentApprovedEvent) => void;
  onPastDue: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  status: "idle",
  summary: null,
  error: null,

  load: async () => {
    // Conserva lo anterior: un refetch atenúa, no deja la pantalla en blanco.
    set({ status: "loading", error: null });
    try {
      set({ status: "ready", summary: await getBillingSummary(), error: null });
    } catch (error) {
      set({ status: "error", error: errorMessage(error) });
    }
  },

  refresh: async () => {
    try {
      set({ summary: await getBillingSummary(), status: "ready", error: null });
    } catch (error) {
      // Un refresco fallido NO tumba una pantalla que ya tiene datos: el
      // usuario está mirando cifras válidas y cambiárselas por un error es
      // peor que servirle un dato de hace unos segundos.
      if (get().summary === null) set({ status: "error", error: errorMessage(error) });
    }
  },

  /**
   * Se emitió la factura del ciclo: cambia el saldo y el número de abiertas, así
   * que se re-consulta en vez de recalcular a mano. El payload no trae el saldo
   * agregado y deducirlo sumando sería inventar el dato.
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
   * La cuenta pasó a mora. El payload solo trae `company_id`, así que el estado
   * nuevo (y con él la cuenta atrás) sale del resumen.
   */
  onPastDue: () => {
    void get().refresh();
  },
}));
