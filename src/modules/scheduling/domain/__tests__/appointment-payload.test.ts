import { buildCreatePayload, buildReschedulePayload } from "../appointment-payload";

const BOGOTA = "America/Bogota";

describe("buildCreatePayload", () => {
  it("convierte fecha+hora de pared del negocio a starts_at UTC", () => {
    const payload = buildCreatePayload(
      "contact-1",
      { date: "2026-08-10", time: "09:00" },
      BOGOTA,
    );
    expect(payload).toEqual({
      contact_id: "contact-1",
      starts_at: "2026-08-10T14:00:00.000Z", // Bogotá = UTC-5
    });
  });

  it("con servicio manda product_id y OMITE duration_minutes (el backend la ignora)", () => {
    const payload = buildCreatePayload(
      "contact-1",
      { date: "2026-08-10", time: "09:00", productId: "svc-1", durationMinutes: 45 },
      BOGOTA,
    );
    expect(payload.product_id).toBe("svc-1");
    expect(payload).not.toHaveProperty("duration_minutes");
  });

  it("sin servicio manda duration_minutes y omite product_id vacío", () => {
    const payload = buildCreatePayload(
      "contact-1",
      { date: "2026-08-10", time: "13:15", productId: "", durationMinutes: 30 },
      BOGOTA,
    );
    expect(payload).not.toHaveProperty("product_id");
    expect(payload.duration_minutes).toBe(30);
    expect(payload.starts_at).toBe("2026-08-10T18:15:00.000Z");
  });

  it("las notas vacías se omiten; con contenido viajan recortadas", () => {
    expect(
      buildCreatePayload("c", { date: "2026-08-10", time: "09:00", notes: "   " }, BOGOTA),
    ).not.toHaveProperty("notes");
    expect(
      buildCreatePayload("c", { date: "2026-08-10", time: "09:00", notes: " hola " }, BOGOTA)
        .notes,
    ).toBe("hola");
  });
});

describe("buildReschedulePayload", () => {
  it("reagendar = PATCH de starts_at (+ duración solo sin servicio)", () => {
    expect(
      buildReschedulePayload(
        { date: "2026-08-12", time: "10:30", productId: "", durationMinutes: 45 },
        BOGOTA,
      ),
    ).toEqual({ starts_at: "2026-08-12T15:30:00.000Z", duration_minutes: 45 });
  });

  it("con servicio NO manda duration_minutes (la gobierna el servicio)", () => {
    expect(
      buildReschedulePayload(
        { date: "2026-08-12", time: "10:30", productId: "svc-1", durationMinutes: 45 },
        BOGOTA,
      ),
    ).toEqual({ starts_at: "2026-08-12T15:30:00.000Z" });
  });
});
