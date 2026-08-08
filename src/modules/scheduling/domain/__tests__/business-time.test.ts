import {
  addDaysToKey,
  addMonthsToKey,
  businessDayKey,
  clampRangeDays,
  diffDays,
  fmtTime,
  instantFromBusiness,
  minutesIntoDay,
  monthMatrix,
  splitAppointmentByDay,
  todayKey,
  weekDays,
  weekStartKey,
  weekdayOfKey,
} from "../business-time";

/**
 * Bogotá no tiene DST, pero el código no debe asumir offset fijo: los casos
 * de conversión se prueban también con America/New_York (UTC-5/UTC-4).
 */
const BOGOTA = "America/Bogota";
const NY = "America/New_York";

describe("business-time", () => {
  describe("conversión instante ↔ pared del negocio", () => {
    it("convierte un instante UTC al día/minutos de Bogotá (UTC-5)", () => {
      // 02:30Z del 9 ago = 21:30 del 8 ago en Bogotá.
      const iso = "2026-08-09T02:30:00.000Z";
      expect(businessDayKey(iso, BOGOTA)).toBe("2026-08-08");
      expect(minutesIntoDay(iso, BOGOTA)).toBe(21 * 60 + 30);
    });

    it("respeta el DST de America/New_York en verano (UTC-4) e invierno (UTC-5)", () => {
      expect(businessDayKey("2026-08-09T03:30:00.000Z", NY)).toBe("2026-08-08");
      expect(minutesIntoDay("2026-08-09T03:30:00.000Z", NY)).toBe(23 * 60 + 30);
      // En enero NY vuelve a UTC-5: 03:30Z son las 22:30 del día anterior.
      expect(minutesIntoDay("2026-01-09T03:30:00.000Z", NY)).toBe(22 * 60 + 30);
    });

    it("instantFromBusiness es la inversa de businessDayKey/minutesIntoDay", () => {
      const iso = instantFromBusiness("2026-08-10", "09:00", BOGOTA);
      expect(iso).toBe("2026-08-10T14:00:00.000Z"); // Bogotá = UTC-5
      expect(businessDayKey(iso, BOGOTA)).toBe("2026-08-10");
      expect(minutesIntoDay(iso, BOGOTA)).toBe(540);
    });

    it("todayKey deriva el día en la zona pedida, no en la del entorno", () => {
      const now = new Date("2026-08-09T02:30:00.000Z");
      expect(todayKey(now, BOGOTA)).toBe("2026-08-08");
      expect(todayKey(now, "Asia/Tokyo")).toBe("2026-08-09");
    });
  });

  describe("aritmética de DayKey", () => {
    it("suma días cruzando fin de mes y de año", () => {
      expect(addDaysToKey("2026-08-30", 3)).toBe("2026-09-02");
      expect(addDaysToKey("2026-12-30", 3)).toBe("2027-01-02");
      expect(addDaysToKey("2026-08-01", -1)).toBe("2026-07-31");
    });

    it("diffDays y weekday (0=domingo, convención backend)", () => {
      expect(diffDays("2026-08-01", "2026-08-08")).toBe(7);
      expect(weekdayOfKey("2026-08-08")).toBe(6); // sábado
      expect(weekdayOfKey("2026-08-09")).toBe(0); // domingo
    });

    it("addMonthsToKey navega meses anclando al día 1", () => {
      expect(addMonthsToKey("2026-08-15", 1)).toBe("2026-09-01");
      expect(addMonthsToKey("2026-01-15", -1)).toBe("2025-12-01");
      expect(addMonthsToKey("2026-12-01", 1)).toBe("2027-01-01");
    });
  });

  describe("grillas (semana inicia lunes)", () => {
    it("weekStartKey devuelve el lunes de la semana", () => {
      expect(weekStartKey("2026-08-08")).toBe("2026-08-03"); // sábado → lunes 3
      expect(weekStartKey("2026-08-03")).toBe("2026-08-03"); // lunes → sí mismo
      expect(weekStartKey("2026-08-09")).toBe("2026-08-03"); // domingo cierra la semana
    });

    it("weekDays devuelve 7 días lunes→domingo", () => {
      const days = weekDays("2026-08-08");
      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2026-08-03");
      expect(days[6]).toBe("2026-08-09");
    });

    it("monthMatrix devuelve SIEMPRE 42 celdas cubriendo el mes completo", () => {
      // Agosto 2026: el 1 es sábado → la matriz arranca el lunes 27 de julio.
      const cells = monthMatrix("2026-08-01");
      expect(cells).toHaveLength(42);
      expect(cells[0]).toBe("2026-07-27");
      expect(cells[41]).toBe("2026-09-06");
      expect(cells).toContain("2026-08-01");
      expect(cells).toContain("2026-08-31");
    });
  });

  describe("splitAppointmentByDay", () => {
    it("cita dentro de un día → un solo tramo", () => {
      const segments = splitAppointmentByDay(
        { starts_at: "2026-08-10T14:00:00.000Z", ends_at: "2026-08-10T14:45:00.000Z" },
        BOGOTA,
      );
      expect(segments).toEqual([
        {
          dayKey: "2026-08-10",
          startMin: 540,
          endMin: 585,
          continuesBefore: false,
          continuesAfter: false,
        },
      ]);
    });

    it("cita que cruza medianoche → dos tramos con flags de continuación", () => {
      // 23:00 → 01:00 de Bogotá.
      const segments = splitAppointmentByDay(
        { starts_at: "2026-08-11T04:00:00.000Z", ends_at: "2026-08-11T06:00:00.000Z" },
        BOGOTA,
      );
      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        dayKey: "2026-08-10",
        startMin: 1380,
        endMin: 1440,
        continuesAfter: true,
      });
      expect(segments[1]).toMatchObject({
        dayKey: "2026-08-11",
        startMin: 0,
        endMin: 60,
        continuesBefore: true,
      });
    });

    it("terminar EXACTAMENTE a medianoche no genera tramo vacío del día siguiente", () => {
      // 23:00 → 00:00 de Bogotá.
      const segments = splitAppointmentByDay(
        { starts_at: "2026-08-11T04:00:00.000Z", ends_at: "2026-08-11T05:00:00.000Z" },
        BOGOTA,
      );
      expect(segments).toEqual([
        {
          dayKey: "2026-08-10",
          startMin: 1380,
          endMin: 1440,
          continuesBefore: false,
          continuesAfter: false,
        },
      ]);
    });
  });

  describe("clampRangeDays", () => {
    it("recorta al máximo permitido y corrige rangos invertidos", () => {
      expect(clampRangeDays("2026-08-01", "2026-08-30", 92)).toEqual({
        from: "2026-08-01",
        to: "2026-08-30",
      });
      expect(clampRangeDays("2026-08-01", "2027-01-01", 92)).toEqual({
        from: "2026-08-01",
        to: addDaysToKey("2026-08-01", 91),
      });
      expect(clampRangeDays("2026-08-10", "2026-08-01", 92)).toEqual({
        from: "2026-08-10",
        to: "2026-08-10",
      });
    });
  });

  describe("formateo es-CO", () => {
    it("fmtTime pinta la hora en la zona del negocio", () => {
      const label = fmtTime("2026-08-10T14:00:00.000Z", BOGOTA);
      expect(label).toContain("9:00");
      expect(label.toLowerCase()).toContain("a");
    });
  });
});
