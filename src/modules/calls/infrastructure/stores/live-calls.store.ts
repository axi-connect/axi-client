import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type { CallSessionRowDTO } from "@/modules/calls/domain/call";
import { listLiveCallSessions } from "@/modules/calls/infrastructure/services/calls-service.adapter";

/** Colapsa la ráfaga de eventos de una misma llamada en UN re-fetch. */
const REFRESH_DEBOUNCE_MS = 400;

let refreshTimer: number | null = null;

type LiveCallsStore = {
  calls: CallSessionRowDTO[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  /** GET /calls/sessions/live — la verdad; el WS solo avisa cuándo re-pedirla. */
  fetchLive: () => Promise<void>;
  /** Re-fetch con debounce: cualquier `call.*` del tenant lo dispara. */
  scheduleRefresh: () => void;
};

export const useLiveCallsStore = create<LiveCallsStore>((set, get) => ({
  calls: [],
  loading: false,
  error: null,
  initialized: false,

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
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void get().fetchLive();
    }, REFRESH_DEBOUNCE_MS);
  },
}));
