import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type { CallSessionRowDTO } from "@/modules/calls/domain/call";
import { listLiveCallSessions } from "@/modules/calls/infrastructure/services/calls-service.adapter";

/** Colapsa la ráfaga de eventos de una misma llamada en UN re-fetch. */
const REFRESH_DEBOUNCE_MS = 400;

type LiveCallsStore = {
  calls: CallSessionRowDTO[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  /** Timer del debounce: vive en el store (no en el módulo) para poder cancelarlo. */
  refresh_timer: number | null;

  /** GET /calls/sessions/live — la verdad; el WS solo avisa cuándo re-pedirla. */
  fetchLive: () => Promise<void>;
  /** Re-fetch con debounce: cualquier `call.*` del tenant lo dispara. */
  scheduleRefresh: () => void;
  /** Al desmontar el Monitoreo: nada de GET fantasma 400 ms después. */
  cancelRefresh: () => void;
};

export const useLiveCallsStore = create<LiveCallsStore>((set, get) => ({
  calls: [],
  loading: false,
  error: null,
  initialized: false,
  refresh_timer: null,

  async fetchLive() {
    set({ loading: true });
    try {
      const result = await listLiveCallSessions();
      set({ calls: result.data, loading: false, error: null, initialized: true });
    } catch (error) {
      set({ loading: false, error: errorMessage(error), initialized: true });
    }
  },

  scheduleRefresh() {
    get().cancelRefresh();
    const timer = window.setTimeout(() => {
      set({ refresh_timer: null });
      void get().fetchLive();
    }, REFRESH_DEBOUNCE_MS);
    set({ refresh_timer: timer });
  },

  cancelRefresh() {
    const timer = get().refresh_timer;
    if (timer !== null) {
      window.clearTimeout(timer);
      set({ refresh_timer: null });
    }
  },
}));
