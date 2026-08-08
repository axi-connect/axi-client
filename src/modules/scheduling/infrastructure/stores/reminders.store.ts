import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import { listChannels, type ChannelDTO } from "@/modules/channels/public";
import type { ReminderDTO, ReminderState } from "@/modules/scheduling/domain/reminder";
import { reminderState } from "@/modules/scheduling/domain/reminder";
import { hydrateContactNames } from "@/modules/scheduling/infrastructure/services/entity-names.cache";
import { listReminders } from "@/modules/scheduling/infrastructure/services/reminders-service.adapter";

/**
 * Store de la vista Recordatorios. Lista completa del tenant (el backend no
 * pagina este recurso); los filtros de estado son client-side — "Enviado" es
 * un estado DERIVADO (one-shot inactivo con last_run_at), no un query param.
 * El filtro por contacto sí va al backend (`contact_id`).
 */
export type ReminderStateFilter = "active" | "sent" | "all";

type RemindersStore = {
  remindersById: Record<string, ReminderDTO>;
  ids: string[];
  loading: boolean;
  error: string | null;

  stateFilter: ReminderStateFilter;
  contactFilter: { id: string; label: string } | null;

  contactNames: Record<string, string>;
  channelsById: Record<string, ChannelDTO>;

  fetch: () => Promise<void>;
  setStateFilter: (filter: ReminderStateFilter) => void;
  setContactFilter: (contact: { id: string; label: string } | null) => void;
  upsertReminder: (reminder: ReminderDTO) => void;
  removeReminder: (id: string) => void;
};

export const useRemindersStore = create<RemindersStore>((set, get) => ({
  remindersById: {},
  ids: [],
  loading: false,
  error: null,
  stateFilter: "active",
  contactFilter: null,
  contactNames: {},
  channelsById: {},

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const [reminders, channels] = await Promise.all([
        listReminders({ contact_id: get().contactFilter?.id }),
        // Los canales cambian poco: un fetch por carga de la vista basta.
        Object.keys(get().channelsById).length > 0
          ? Promise.resolve(null)
          : listChannels().then((res) => res.data),
      ]);
      set((state) => ({
        remindersById: Object.fromEntries(reminders.map((r) => [r.id, r])),
        ids: reminders.map((r) => r.id),
        loading: false,
        channelsById:
          channels === null
            ? state.channelsById
            : Object.fromEntries(channels.map((c) => [c.id, c])),
      }));
      const contactIds = reminders
        .map((r) => r.contact_id)
        .filter((id): id is string => id !== null);
      if (contactIds.length > 0) {
        try {
          const resolved = await hydrateContactNames(contactIds);
          set((state) => ({ contactNames: { ...state.contactNames, ...resolved } }));
        } catch {
          // Fallback "Contacto" en la tabla.
        }
      }
    } catch (err) {
      set({ loading: false, error: errorMessage(err, "No se pudieron cargar los recordatorios") });
    }
  },

  setStateFilter: (filter) => set({ stateFilter: filter }),

  setContactFilter: (contact) => {
    set({ contactFilter: contact });
    void get().fetch();
  },

  upsertReminder: (reminder) => {
    set((state) => ({
      remindersById: { ...state.remindersById, [reminder.id]: reminder },
      ids: state.ids.includes(reminder.id) ? state.ids : [reminder.id, ...state.ids],
    }));
  },

  removeReminder: (id) => {
    set((state) => {
      const next = { ...state.remindersById };
      delete next[id];
      return { remindersById: next, ids: state.ids.filter((existing) => existing !== id) };
    });
  },
}));

/** Ids visibles según el filtro de estado derivado. */
export function visibleReminderIds(
  ids: string[],
  remindersById: Record<string, ReminderDTO>,
  filter: ReminderStateFilter,
): string[] {
  if (filter === "all") return ids;
  const wanted: ReminderState = filter;
  return ids.filter((id) => {
    const reminder = remindersById[id];
    return reminder !== undefined && reminderState(reminder) === wanted;
  });
}
