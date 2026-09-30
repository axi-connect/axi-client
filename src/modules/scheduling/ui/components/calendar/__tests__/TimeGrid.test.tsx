import { fireEvent, render, screen } from "@testing-library/react";
import type { AppointmentDTO, AppointmentSegment } from "@/modules/scheduling/domain/appointment";
import { groupSegmentsByDay } from "@/modules/scheduling/domain/appointment";
import { TimeGrid } from "../TimeGrid";

const BOGOTA = "America/Bogota";
const HOUR_PX = 64;
const SCHEDULES = [{ weekday: 3, opens_at: "08:00", closes_at: "18:00" }] as never[];

function appt(id: string, startsAt: string, endsAt: string, status: AppointmentDTO["status"] = "scheduled"): AppointmentDTO {
  return {
    id,
    contact_id: `c-${id}`,
    product_id: null,
    assigned_user_id: null,
    starts_at: startsAt,
    ends_at: endsAt,
    status,
    notes: null,
    created_by_type: "user",
    created_by_user_id: null,
    conversation_id: null,
    call_session_id: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: "2026-09-29T00:00:00.000Z",
    updated_at: "2026-09-29T00:00:00.000Z",
  };
}

function renderGrid(
  appointments: AppointmentDTO[],
  opts: { onCreateAt?: jest.Mock | null; statusFilter?: AppointmentDTO["status"] | "all" } = {},
) {
  const segments: Map<string, AppointmentSegment[]> = groupSegmentsByDay(appointments, BOGOTA);
  const onOpen = jest.fn();
  const onCreateAt = opts.onCreateAt === undefined ? jest.fn() : opts.onCreateAt;
  const view = render(
    <TimeGrid
      days={["2026-09-30"]}
      timezone={BOGOTA}
      todayKey="2026-09-30"
      schedules={SCHEDULES}
      segmentsByDay={segments}
      statusFilter={opts.statusFilter ?? "all"}
      contactNames={Object.fromEntries(appointments.map((a) => [a.contact_id, `Nombre ${a.id}`]))}
      onOpen={onOpen}
      onCreateAt={onCreateAt}
    />,
  );
  // jsdom no mide: getBoundingClientRect da top 0, así que clientY = desplazamiento.
  const column = view.container.querySelectorAll<HTMLDivElement>(".relative.border-l")[0];
  return { onOpen, onCreateAt, column };
}

describe("TimeGrid · tocar un hueco", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Miércoles 30, 10:40 en Bogotá.
    jest.setSystemTime(new Date("2026-09-30T15:40:00.000Z"));
  });
  afterEach(() => jest.useRealTimers());

  it("un hueco futuro abre «Nueva cita» con esa media hora", () => {
    const { onCreateAt, column } = renderGrid([]);
    fireEvent.click(column, { clientY: 13 * HOUR_PX + 10 });
    expect(onCreateAt).toHaveBeenCalledWith("2026-09-30", 13 * 60);
  });

  it("un hueco que ya pasó no crea nada", () => {
    const { onCreateAt, column } = renderGrid([]);
    fireEvent.click(column, { clientY: 9 * HOUR_PX + 10 });
    expect(onCreateAt).not.toHaveBeenCalled();
    // La media hora en curso (10:30–11:00) todavía sirve.
    fireEvent.click(column, { clientY: 10 * HOUR_PX + 40 });
    expect(onCreateAt).toHaveBeenCalledWith("2026-09-30", 10 * 60 + 30);
  });

  it("tocar una cita la abre y no crea otra encima", () => {
    const { onOpen, onCreateAt } = renderGrid([
      appt("a", "2026-09-30T18:00:00.000Z", "2026-09-30T18:45:00.000Z"),
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Nombre a/ }));
    expect(onOpen).toHaveBeenCalledWith("a");
    expect(onCreateAt).not.toHaveBeenCalled();
  });

  it("sin permiso de gestión la rejilla no crea", () => {
    const { column } = renderGrid([], { onCreateAt: null });
    // No hay handler que llamar: basta con que el clic no rompa y no haya cursor de acción.
    fireEvent.click(column, { clientY: 13 * HOUR_PX });
    expect(column.className).not.toContain("cursor-pointer");
  });
});

describe("TimeGrid · D1 canceladas", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-30T12:00:00.000Z"));
  });
  afterEach(() => jest.useRealTimers());

  const DAY = [
    appt("a", "2026-09-30T15:00:00.000Z", "2026-09-30T15:45:00.000Z"),
    appt("x", "2026-09-30T15:00:00.000Z", "2026-09-30T15:45:00.000Z", "cancelled"),
  ];

  it("la cancelada no ocupa columna con «Todos los estados»", () => {
    renderGrid(DAY);
    expect(screen.getByRole("button", { name: /Nombre a/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nombre x/ })).not.toBeInTheDocument();
    // La activa se queda con todo el ancho de la columna.
    expect(screen.getByRole("button", { name: /Nombre a/ }).style.width).toBe("calc(100% - 7px)");
  });

  it("vuelve al filtrar por «Cancelada»", () => {
    renderGrid(DAY.filter((a) => a.status === "cancelled"), { statusFilter: "cancelled" });
    expect(screen.getByRole("button", { name: /Nombre x/ })).toBeInTheDocument();
  });

  it("el día sin citas lo dice y deja tocar la rejilla", () => {
    renderGrid([]);
    expect(screen.getByText("Día libre")).toBeInTheDocument();
    expect(screen.getByText("Toca una hora del calendario para agendar.")).toBeInTheDocument();
  });
});
