import {
  allowedTransitions,
  appointmentOrigin,
  groupSegmentsByDay,
  isTerminalStatus,
  showsInTimeGrid,
  type AppointmentDTO,
} from "../appointment";

const BOGOTA = "America/Bogota";

function appointment(overrides: Partial<AppointmentDTO> = {}): AppointmentDTO {
  return {
    id: "a1",
    contact_id: "c1",
    product_id: null,
    assigned_user_id: null,
    starts_at: "2026-08-10T14:00:00.000Z",
    ends_at: "2026-08-10T14:45:00.000Z",
    status: "scheduled",
    notes: null,
    created_by_type: "user",
    conversation_id: null,
    call_session_id: null,
    created_by_user_id: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("allowedTransitions (política de la UI)", () => {
  it("scheduled sin iniciar → confirmar, reagendar, cancelar", () => {
    expect(allowedTransitions("scheduled", false)).toEqual(["confirm", "reschedule", "cancel"]);
  });

  it("scheduled ya iniciada añade completar / no asistió", () => {
    expect(allowedTransitions("scheduled", true)).toEqual([
      "confirm",
      "complete",
      "no_show",
      "reschedule",
      "cancel",
    ]);
  });

  it("confirmed ya iniciada → completar, no asistió, reagendar, cancelar", () => {
    expect(allowedTransitions("confirmed", true)).toEqual([
      "complete",
      "no_show",
      "reschedule",
      "cancel",
    ]);
  });

  it("estados terminales no ofrecen acciones", () => {
    for (const status of ["completed", "cancelled", "no_show"] as const) {
      expect(isTerminalStatus(status)).toBe(true);
      expect(allowedTransitions(status, true)).toEqual([]);
    }
  });
});

describe("groupSegmentsByDay", () => {
  it("agrupa por día de negocio preservando el orden del backend", () => {
    const a = appointment({ id: "a" });
    const b = appointment({
      id: "b",
      starts_at: "2026-08-10T16:00:00.000Z",
      ends_at: "2026-08-10T16:30:00.000Z",
    });
    const grouped = groupSegmentsByDay([a, b], BOGOTA);
    expect([...grouped.keys()]).toEqual(["2026-08-10"]);
    expect(grouped.get("2026-08-10")?.map((e) => e.appointment.id)).toEqual(["a", "b"]);
  });

  it("una cita que cruza medianoche aparece en ambos días", () => {
    const crossing = appointment({
      id: "x",
      starts_at: "2026-08-11T04:00:00.000Z", // 23:00 Bogotá del 10
      ends_at: "2026-08-11T06:00:00.000Z", // 01:00 Bogotá del 11
    });
    const grouped = groupSegmentsByDay([crossing], BOGOTA);
    expect([...grouped.keys()].sort()).toEqual(["2026-08-10", "2026-08-11"]);
    expect(grouped.get("2026-08-10")?.[0].segment.continuesAfter).toBe(true);
    expect(grouped.get("2026-08-11")?.[0].segment.continuesBefore).toBe(true);
  });
});

describe("appointmentOrigin («Ver llamada» / «Ver conversación»)", () => {
  it("agendada en una llamada → la llamada, aunque haya conversación", () => {
    expect(appointmentOrigin(appointment({ call_session_id: "cs1" }))).toEqual({
      kind: "call",
      callSessionId: "cs1",
    });
    expect(
      appointmentOrigin(appointment({ call_session_id: "cs1", conversation_id: "cv1" })).kind,
    ).toBe("call");
  });

  it("agendada en un chat → la conversación", () => {
    expect(appointmentOrigin(appointment({ conversation_id: "cv1" }))).toEqual({
      kind: "conversation",
      conversationId: "cv1",
    });
  });

  it("sin ninguna de las dos → el equipo", () => {
    expect(appointmentOrigin(appointment()).kind).toBe("team");
  });
});

describe("showsInTimeGrid (D1: las canceladas no ocupan columna)", () => {
  it("la cancelada sale de la rejilla con cualquier otro filtro", () => {
    expect(showsInTimeGrid("cancelled", "all")).toBe(false);
    expect(showsInTimeGrid("cancelled", "scheduled")).toBe(false);
  });

  it("vuelve si el filtro pide justo «Cancelada»; el resto siempre se ve", () => {
    expect(showsInTimeGrid("cancelled", "cancelled")).toBe(true);
    expect(showsInTimeGrid("scheduled", "all")).toBe(true);
    expect(showsInTimeGrid("no_show", "all")).toBe(true);
  });
});
