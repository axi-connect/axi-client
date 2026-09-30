import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppointmentComposer } from "../AppointmentComposer";

const BOGOTA = "America/Bogota";
const SCHEDULES = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opens_at: "08:00", closes_at: "18:00" })) as never[];

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));
jest.mock("@/modules/catalog/public", () => ({
  listProducts: jest.fn(async () => ({
    data: [{ id: "svc-1", name: "Asesoría de viaje", duration_minutes: 45 }],
  })),
}));
jest.mock("@/modules/crm/public", () => ({
  ContactPicker: ({ onChange }: { onChange: (v: { id: string; label: string }) => void }) => (
    <button type="button" onClick={() => onChange({ id: "c-1", label: "Camila Restrepo" })}>
      elegir contacto
    </button>
  ),
}));
const getAvailability = jest.fn();
jest.mock("@/modules/scheduling/infrastructure/services/availability-service.adapter", () => ({
  getAvailability: (...args: unknown[]) => getAvailability(...args),
}));
const createAppointment = jest.fn();
jest.mock("@/modules/scheduling/infrastructure/services/appointments-service.adapter", () => ({
  createAppointment: (...args: unknown[]) => createAppointment(...args),
  updateAppointment: jest.fn(),
}));
jest.mock("@/modules/scheduling/infrastructure/stores/calendar.store", () => ({
  useCalendarStore: (selector: (s: unknown) => unknown) => selector({ refresh: jest.fn(), upsertAppointment: jest.fn() }),
}));
jest.mock("@/core/api/problem", () => ({
  ...jest.requireActual("@/core/api/problem"),
  isHttpError: (err: unknown) => typeof err === "object" && err !== null && "code" in err,
}));

const OCT1 = [
  // 1 oct 9:00 y 10:00 en Bogotá
  { starts_at: "2026-10-01T14:00:00.000Z", ends_at: "2026-10-01T14:45:00.000Z", remaining_capacity: 1 },
  { starts_at: "2026-10-01T15:00:00.000Z", ends_at: "2026-10-01T15:45:00.000Z", remaining_capacity: 1 },
];

function renderComposer(onSuccess = jest.fn()) {
  render(
    <AppointmentComposer
      mode={{ kind: "create", prefill: null }}
      timezone={BOGOTA}
      schedules={SCHEDULES}
      onCancel={jest.fn()}
      onSuccess={onSuccess}
    />,
  );
  return { onSuccess };
}

describe("AppointmentComposer · nueva cita", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
    // Miércoles 30 de septiembre de 2026, 10:40 en Bogotá.
    jest.setSystemTime(new Date("2026-09-30T15:40:00.000Z"));
    getAvailability.mockReset();
    createAppointment.mockReset();
    getAvailability.mockResolvedValue({ timezone: BOGOTA, duration_minutes: 45, schedule_configured: true, slots: OCT1 });
  });
  afterEach(() => jest.useRealTimers());

  it("abre en el primer día con horarios y agenda en la zona del negocio", async () => {
    const { onSuccess } = renderComposer();
    // El servicio por defecto consulta su propia duración para el mes en curso (desde hoy).
    await waitFor(() => expect(getAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ date_from: "2026-09-30", date_to: "2026-09-30", product_id: "svc-1" }),
    ));
    // El mes de septiembre solo tiene hoy: sin horarios. Se pasa a octubre.
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await screen.findByText(/2 horarios libres/);

    const submit = screen.getByRole("button", { name: "Agendar cita" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "elegir contacto" }));
    fireEvent.click(screen.getByRole("button", { name: "10:00" }));
    expect(screen.getByText(/10:00 – 10:45/)).toBeInTheDocument();
    expect(submit).not.toBeDisabled();

    createAppointment.mockResolvedValue({ id: "a-new" });
    await act(async () => {
      fireEvent.click(submit);
    });
    expect(createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ contact_id: "c-1", product_id: "svc-1", starts_at: "2026-10-01T15:00:00.000Z" }),
    );
    expect(onSuccess).toHaveBeenCalledWith({ id: "a-new" });
  });

  it("409: no cierra, limpia la hora, lo dice y vuelve a consultar", async () => {
    const { onSuccess } = renderComposer();
    fireEvent.click(await screen.findByRole("button", { name: "Mes siguiente" }));
    await screen.findByText(/2 horarios libres/);
    fireEvent.click(screen.getByRole("button", { name: "elegir contacto" }));
    fireEvent.click(screen.getByRole("button", { name: "10:00" }));
    const calls = getAvailability.mock.calls.length;

    createAppointment.mockRejectedValue({ code: "scheduling/slot_unavailable", is: (c: string) => c === "scheduling/slot_unavailable" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Agendar cita" }));
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Las 10:00 se acaban de ocupar");
    expect(screen.getByRole("button", { name: "Agendar cita" })).toBeDisabled();
    await waitFor(() => expect(getAvailability.mock.calls.length).toBeGreaterThan(calls));
  });

  it("otra hora fuera del horario: lo avisa y deja agendar", async () => {
    renderComposer();
    fireEvent.click(await screen.findByRole("button", { name: "Mes siguiente" }));
    await screen.findByText(/2 horarios libres/);
    fireEvent.click(screen.getByRole("button", { name: "Otra hora…" }));
    fireEvent.change(screen.getByLabelText("Hora de la cita"), { target: { value: "18:30" } });
    expect(screen.getByText(/18:30 está fuera de tu horario/)).toBeInTheDocument();
    // Dentro del horario, no hay aviso.
    fireEvent.change(screen.getByLabelText("Hora de la cita"), { target: { value: "11:00" } });
    expect(screen.queryByText(/está fuera de tu horario/)).not.toBeInTheDocument();
  });
});
