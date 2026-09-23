import { formatMillions, formatRate, monthLabel, shortDay } from "../format";

describe("formatMillions", () => {
  it("un decimal y sin ceros de relleno", () => {
    expect(formatMillions(1_110_000_000)).toBe("$ 11,1 M");
    expect(formatMillions(3_000_000_000)).toBe("$ 30 M");
    expect(formatMillions(1_894_000_000)).toBe("$ 18,9 M");
  });

  it("por debajo del millón la cifra completa", () => {
    expect(formatMillions(71_000_000).replace(/ /g, " ")).toBe("$ 710.000");
  });

  it("otras monedas llevan su símbolo", () => {
    expect(formatMillions(250_000_000, "USD")).toBe("US$ 2,5 M");
  });
});

describe("formatRate", () => {
  it("hasta dos decimales, coma decimal", () => {
    expect(formatRate(1.35)).toBe("1,35");
    expect(formatRate(1.6)).toBe("1,6");
    expect(formatRate(2)).toBe("2");
    expect(formatRate(2.6667)).toBe("2,67");
  });
});

describe("monthLabel / shortDay", () => {
  it("mes en minúsculas y día corto sin punto", () => {
    expect(monthLabel("2026-09-01")).toBe("septiembre");
    expect(shortDay("2026-09-01")).toBe("1 sep");
  });
});
