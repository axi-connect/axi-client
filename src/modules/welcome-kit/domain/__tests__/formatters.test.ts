import {
  addDays,
  displayUrl,
  firstName,
  formatClockTime,
  formatCop,
  formatFileSize,
  formatInteger,
  formatPhone,
  formatShortDate,
  joinEs,
  panelHref,
  parseCivilDate,
  trialEndDate,
  trialRange,
  whatsappHref,
} from "../formatters";

describe("fechas es-CO del kit", () => {
  it("lee una fecha civil y rechaza las que no existen", () => {
    expect(parseCivilDate("2026-09-29")).toEqual({ year: 2026, month: 9, day: 29 });
    expect(() => parseCivilDate("2026-02-30")).toThrow();
    expect(() => parseCivilDate("29/09/2026")).toThrow();
  });

  it("suma días cruzando mes y año", () => {
    expect(addDays({ year: 2026, month: 9, day: 29 }, 7)).toEqual({ year: 2026, month: 10, day: 6 });
    expect(addDays({ year: 2026, month: 12, day: 28 }, 7)).toEqual({ year: 2027, month: 1, day: 4 });
  });

  it("pinta el mes corto del paquete de diseño, con año opcional", () => {
    expect(formatShortDate({ year: 2026, month: 9, day: 29 })).toBe("29 sep");
    expect(formatShortDate({ year: 2026, month: 10, day: 6 }, true)).toBe("6 oct 2026");
  });

  it("trialRange va del día 0 al día 7", () => {
    expect(trialRange("2026-09-29")).toBe("29 sep → 6 oct");
    expect(trialRange("2026-12-30")).toBe("30 dic → 6 ene");
    expect(trialEndDate("2026-09-29")).toEqual({ year: 2026, month: 10, day: 6 });
  });

  it("no se mueve de día por la zona horaria del proceso", () => {
    // La fecha civil se calcula en UTC: un «2026-09-29» nunca sale como el 28.
    expect(trialRange("2026-09-29T00:00:00-05:00")).toBe("29 sep → 6 oct");
  });
});

describe("precios y cifras", () => {
  it("separa miles con punto", () => {
    expect(formatInteger(75)).toBe("75");
    expect(formatInteger(1000)).toBe("1.000");
    expect(formatInteger(1234567)).toBe("1.234.567");
  });

  it("pinta pesos colombianos sin decimales y redondea", () => {
    expect(formatCop(150000)).toBe("$ 150.000");
    expect(formatCop(221900.6)).toBe("$ 221.901");
    expect(formatCop(0)).toBe("$ 0");
  });

  it("pinta el tamaño del catálogo con coma decimal", () => {
    expect(formatFileSize(1258291)).toBe("1,2 MB");
    expect(formatFileSize(870400)).toBe("850 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3 MB");
  });
});

describe("joinEs: los medios de pago en una frase", () => {
  it("usa «o» antes del último", () => {
    expect(joinEs(["Nequi", "PSE", "Tarjeta"])).toBe("Nequi, PSE o Tarjeta");
    expect(joinEs(["Nequi", "PSE"])).toBe("Nequi o PSE");
  });

  it("no inventa conectores con uno o ninguno", () => {
    expect(joinEs(["Nequi"])).toBe("Nequi");
    expect(joinEs([])).toBe("");
  });
});

describe("hora, nombres, teléfono y enlaces", () => {
  it("pasa HH:mm a la hora es-CO de 12 horas", () => {
    expect(formatClockTime("07:30")).toBe("7:30 a. m.");
    expect(formatClockTime("12:00")).toBe("12:00 p. m.");
    expect(formatClockTime("00:15")).toBe("12:15 a. m.");
    expect(formatClockTime("19:05")).toBe("7:05 p. m.");
    expect(formatClockTime("mañana")).toBe("mañana");
  });

  it("toma el primer nombre del asesor", () => {
    expect(firstName("Camila Restrepo")).toBe("Camila");
    expect(firstName("  Ana  María Díaz ")).toBe("Ana");
  });

  it("parte un celular colombiano y deja lo demás tal cual", () => {
    expect(formatPhone("+573004821937")).toBe("+57 300 482 1937");
    expect(formatPhone("+525512345678")).toBe("+525512345678");
    expect(whatsappHref("+57 300 482 1937")).toBe("https://wa.me/573004821937");
  });

  it("muestra el panel sin protocolo y lo enlaza siempre por https", () => {
    expect(displayUrl("https://app.axi-connect.co/")).toBe("app.axi-connect.co");
    expect(panelHref("http://app.axi-connect.co")).toBe("https://app.axi-connect.co");
    expect(panelHref("app.axi-connect.co")).toBe("https://app.axi-connect.co");
  });
});
