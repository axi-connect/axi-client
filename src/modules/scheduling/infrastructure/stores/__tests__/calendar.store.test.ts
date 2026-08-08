import type { AppointmentDTO } from "@/modules/scheduling/domain/appointment";
import { listAppointments } from "@/modules/scheduling/infrastructure/services/appointments-service.adapter";
import { useCalendarStore } from "../calendar.store";

jest.mock(
  "@/modules/scheduling/infrastructure/services/appointments-service.adapter",
  () => ({
    listAppointments: jest.fn(),
  }),
);
jest.mock("@/modules/scheduling/infrastructure/services/entity-names.cache", () => ({
  hydrateContactNames: jest.fn().mockResolvedValue({}),
  hydrateServiceNames: jest.fn().mockResolvedValue(new Map()),
}));

const listMock = listAppointments as jest.MockedFunction<typeof listAppointments>;

const BOGOTA = "America/Bogota";

function appointment(id: string, startsAt: string): AppointmentDTO {
  return {
    id,
    contact_id: `contact-${id}`,
    product_id: null,
    assigned_user_id: null,
    starts_at: startsAt,
    ends_at: startsAt,
    status: "scheduled",
    notes: null,
    created_by_type: "user",
    conversation_id: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: startsAt,
    updated_at: startsAt,
  };
}

const initialState = useCalendarStore.getState();

describe("calendar.store", () => {
  beforeEach(() => {
    useCalendarStore.setState(initialState, true);
    listMock.mockReset();
    listMock.mockResolvedValue([]);
    window.localStorage.clear();
  });

  it("init fija zona + ancla de hoy y dispara el primer fetch", async () => {
    useCalendarStore.getState().init(BOGOTA);
    const state = useCalendarStore.getState();
    expect(state.timezone).toBe(BOGOTA);
    expect(state.anchor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await Promise.resolve();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("no refetchea cuando el rango cargado cubre el pedido (mes ⊇ semana)", async () => {
    listMock.mockResolvedValue([appointment("a", "2026-08-10T14:00:00.000Z")]);
    useCalendarStore.setState({
      timezone: BOGOTA,
      anchor: "2026-08-10",
      listRange: { from: "2026-08-10", to: "2026-09-09" },
      initialized: true,
      view: "month",
    });
    await useCalendarStore.getState().fetchRange();
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(useCalendarStore.getState().rangeIds).toEqual(["a"]);

    // Semana dentro del mismo mes cargado → no-op.
    useCalendarStore.setState({ view: "week" });
    await useCalendarStore.getState().fetchRange();
    expect(listMock).toHaveBeenCalledTimes(1);

    // force → refetch aunque el rango esté cubierto.
    await useCalendarStore.getState().refresh();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("un rango NO cubierto refetchea (semana de otro mes)", async () => {
    useCalendarStore.setState({
      timezone: BOGOTA,
      anchor: "2026-08-10",
      listRange: { from: "2026-08-10", to: "2026-09-09" },
      initialized: true,
      view: "week",
    });
    await useCalendarStore.getState().fetchRange();
    expect(listMock).toHaveBeenCalledTimes(1);

    useCalendarStore.setState({ anchor: "2026-10-05" });
    await useCalendarStore.getState().fetchRange();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("un fallo del backend deja error legible sin tumbar el estado", async () => {
    listMock.mockRejectedValue(new Error("boom"));
    useCalendarStore.setState({
      timezone: BOGOTA,
      anchor: "2026-08-10",
      listRange: { from: "2026-08-10", to: "2026-09-09" },
      initialized: true,
      view: "day",
    });
    await useCalendarStore.getState().fetchRange();
    const state = useCalendarStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).not.toBeNull();
  });

  it("upsertAppointment integra la cita al índice local", () => {
    const fresh = appointment("z", "2026-08-11T14:00:00.000Z");
    useCalendarStore.getState().upsertAppointment(fresh);
    expect(useCalendarStore.getState().appointmentsById.z).toEqual(fresh);
  });
});
