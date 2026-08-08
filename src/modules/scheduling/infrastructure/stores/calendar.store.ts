import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type { AppointmentDTO, AppointmentStatus } from "@/modules/scheduling/domain/appointment";
import {
  addDaysToKey,
  todayKey,
  type DayKey,
} from "@/modules/scheduling/domain/business-time";
import {
  rangeCovers,
  rangeForView,
  stepAnchor,
  type CalendarViewKind,
} from "@/modules/scheduling/domain/calendar-range";
import { listAppointments } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import {
  hydrateContactNames,
  hydrateServiceNames,
} from "@/modules/scheduling/infrastructure/services/entity-names.cache";

/**
 * Store del calendario de citas (espejo estructural de `crm/board.store.ts`).
 * Sin WebSocket de agenda: los datos se refrescan por navegación y tras cada
 * mutación (`refresh()`).
 *
 * `anchor` y `listRange` viven como DayKey ("YYYY-MM-DD" en la zona del
 * negocio); el rango UTC de fetch se deriva con `rangeForView`.
 */
const VIEW_STORAGE_KEY = "axi:scheduling:view";
const LIST_DEFAULT_DAYS = 30;

const VIEW_VALUES: readonly CalendarViewKind[] = ["month", "week", "day", "list"];

type CalendarStore = {
  // Preferencias (hidratadas post-mount, patrón board.store)
  view: CalendarViewKind;
  setView: (view: CalendarViewKind) => void;

  // Navegación (pared del negocio)
  timezone: string | null;
  anchor: DayKey;
  listRange: { from: DayKey; to: DayKey };
  statusFilter: AppointmentStatus | "all";
  initialized: boolean;

  /** Fija la zona del negocio, hidrata preferencias y carga el rango inicial. */
  init: (timezone: string) => void;
  setAnchor: (anchor: DayKey) => void;
  goToday: () => void;
  step: (delta: 1 | -1) => void;
  setListRange: (from: DayKey, to: DayKey) => void;
  setStatusFilter: (status: AppointmentStatus | "all") => void;

  // Datos del rango cargado
  appointmentsById: Record<string, AppointmentDTO>;
  /** Ids en orden `starts_at asc` (el orden del backend). */
  rangeIds: string[];
  loadedRange: { fromUtc: string; toUtc: string } | null;
  loading: boolean;
  error: string | null;

  // Hidratación de nombres (los DTO no los embeben)
  contactNames: Record<string, string>;
  productNames: Record<string, string>;

  /** No-op si el rango cargado ya cubre el pedido (salvo `force`). */
  fetchRange: (opts?: { force?: boolean }) => Promise<void>;
  /** Re-fetch forzado del rango visible; llamar tras cada mutación. */
  refresh: () => Promise<void>;
  /** Upsert local (detalle recién consultado o mutado). */
  upsertAppointment: (appointment: AppointmentDTO) => void;
};

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  view: "week",
  timezone: null,
  anchor: "",
  listRange: { from: "", to: "" },
  statusFilter: "all",
  initialized: false,
  appointmentsById: {},
  rangeIds: [],
  loadedRange: null,
  loading: false,
  error: null,
  contactNames: {},
  productNames: {},

  init: (timezone) => {
    if (get().initialized && get().timezone === timezone) return;
    let view = get().view;
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (VIEW_VALUES.includes(stored as CalendarViewKind)) view = stored as CalendarViewKind;
    } catch {
      // localStorage no disponible: default.
    }
    const anchor = todayKey(new Date(), timezone);
    set({
      timezone,
      view,
      anchor,
      listRange: { from: anchor, to: addDaysToKey(anchor, LIST_DEFAULT_DAYS) },
      initialized: true,
    });
    void get().fetchRange();
  },

  setView: (view) => {
    set({ view });
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Sin persistencia: aplica solo a la sesión actual.
    }
    void get().fetchRange();
  },

  setAnchor: (anchor) => {
    set({ anchor });
    void get().fetchRange();
  },

  goToday: () => {
    const timezone = get().timezone;
    if (timezone === null) return;
    set({ anchor: todayKey(new Date(), timezone) });
    void get().fetchRange();
  },

  step: (delta) => {
    const { view, anchor } = get();
    set({ anchor: stepAnchor(view, anchor, delta) });
    void get().fetchRange();
  },

  setListRange: (from, to) => {
    set({ listRange: { from, to } });
    void get().fetchRange();
  },

  setStatusFilter: (status) => {
    // Filtro client-side: el rango ya está en memoria, no amerita refetch.
    set({ statusFilter: status });
  },

  fetchRange: async ({ force = false } = {}) => {
    const { timezone, view, anchor, listRange, loadedRange } = get();
    if (timezone === null || anchor === "") return;
    const range = rangeForView(view, anchor, timezone, listRange);
    if (!force && loadedRange !== null && rangeCovers(loadedRange, range)) return;

    set({ loading: true, error: null });
    try {
      const appointments = await listAppointments({ from: range.fromUtc, to: range.toUtc });
      set({
        appointmentsById: Object.fromEntries(appointments.map((a) => [a.id, a])),
        rangeIds: appointments.map((a) => a.id),
        loadedRange: { fromUtc: range.fromUtc, toUtc: range.toUtc },
        loading: false,
      });
      // Render progresivo: la grilla no espera los nombres.
      void hydrateNames(appointments, set);
    } catch (err) {
      set({ loading: false, error: errorMessage(err, "No se pudo cargar la agenda") });
    }
  },

  refresh: () => get().fetchRange({ force: true }),

  upsertAppointment: (appointment) => {
    set((state) => ({
      appointmentsById: { ...state.appointmentsById, [appointment.id]: appointment },
    }));
    void hydrateNames([appointment], set);
  },
}));

type SetState = (
  partial: (state: CalendarStore) => Partial<CalendarStore>,
) => void;

async function hydrateNames(appointments: AppointmentDTO[], set: SetState): Promise<void> {
  const contactIds = appointments.map((a) => a.contact_id);
  if (contactIds.length > 0) {
    try {
      const resolved = await hydrateContactNames(contactIds);
      set((state) => ({ contactNames: { ...state.contactNames, ...resolved } }));
    } catch {
      // Sin nombres: la grilla pinta el fallback.
    }
  }
  if (appointments.some((a) => a.product_id !== null)) {
    try {
      const services = await hydrateServiceNames();
      set((state) => ({
        productNames: { ...state.productNames, ...Object.fromEntries(services) },
      }));
    } catch {
      // Ídem: el servicio se muestra como "Servicio".
    }
  }
}
