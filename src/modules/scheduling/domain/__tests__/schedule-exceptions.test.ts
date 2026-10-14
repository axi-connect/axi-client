import {
  fmtDateDmy,
  holidayCountryName,
  holidayNote,
  holidayTitle,
  QUARTER_HOURS,
  windowIssues,
  windowsLabel,
} from "../schedule-exceptions";

describe("días especiales (S-05)", () => {
  it("fmtDateDmy: dd/mm/aaaa sin depender del navegador", () => {
    expect(fmtDateDmy("2026-10-19")).toBe("19/10/2026");
    expect(fmtDateDmy("")).toBe("");
  });

  it("QUARTER_HOURS: de 00:00 a 23:45 de 15 en 15", () => {
    expect(QUARTER_HOURS).toHaveLength(96);
    expect(QUARTER_HOURS[0]).toBe("00:00");
    expect(QUARTER_HOURS[41]).toBe("10:15");
    expect(QUARTER_HOURS.at(-1)).toBe("23:45");
  });

  it("windowIssues: al menos una franja, abre antes de cerrar y sin cruces", () => {
    expect(windowIssues([])).toEqual(["Indica al menos una franja"]);
    expect(windowIssues([{ opens_at: "14:00", closes_at: "10:00" }])).toEqual([
      "Una franja cierra antes de abrir",
    ]);
    expect(
      windowIssues([
        { opens_at: "10:00", closes_at: "14:00" },
        { opens_at: "13:00", closes_at: "17:00" },
      ]),
    ).toEqual(["Dos franjas se cruzan"]);
    expect(
      windowIssues([
        { opens_at: "15:00", closes_at: "17:00" },
        { opens_at: "08:00", closes_at: "10:00" },
      ]),
    ).toEqual([]);
  });

  it("windowsLabel y el nombre del país del calendario", () => {
    expect(
      windowsLabel([
        { opens_at: "08:00", closes_at: "10:00" },
        { opens_at: "14:00", closes_at: "16:00" },
      ]),
    ).toBe("08:00–10:00, 14:00–16:00");
    expect(holidayCountryName("CO")).toBe("Colombia");
    expect(holidayCountryName("MX")).toBe("tu país");
  });
});

describe("nombre del festivo (H-128)", () => {
  it("la fila del festivo lleva su nombre; sin nombre, el del país", () => {
    expect(holidayTitle("Día de la Raza", "Colombia")).toBe("Festivo · Día de la Raza");
    expect(holidayTitle(null, "Colombia")).toBe("Festivo de Colombia");
    expect(holidayTitle(null, "")).toBe("Festivo");
  });

  it("un día especial en festivo dice cuál; abierto a propósito si tiene horario", () => {
    expect(holidayNote(true, true, "Todos los Santos")).toBe("Festivo: Todos los Santos");
    expect(holidayNote(true, false, "Todos los Santos")).toBe(
      "Festivo: Todos los Santos, abierto a propósito",
    );
    expect(holidayNote(false, true, null)).toBe("Sin nota");
  });
});
