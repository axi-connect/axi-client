import { shortLabel, stepChips } from "../components/AxelChat";

describe("stepChips", () => {
  it("el tipo sale de la herramienta, el texto se recorta a dos palabras y el actual se marca", () => {
    const chips = stepChips([
      { name: "get_sales_summary", label: "Leyendo tus ventas del mes", done: true, ms: 300, productive: true },
      { name: "compute_pace", label: "Calculando el ritmo", done: false, ms: null, productive: null },
      { name: "create_proposal", label: "Proponer", done: false, ms: null, productive: null },
    ]);
    expect(chips.map((chip) => [chip.label, chip.tone, chip.current])).toEqual([
      ["Ventas del mes", "done", false],
      ["Ritmo", "calc", false],
      ["Proponer", "send", true],
    ]);
  });
});

describe("shortLabel", () => {
  it("se queda con lo que mira", () => {
    expect(shortLabel("Revisando tus campañas activas de octubre…")).toBe("Campañas activas");
    expect(shortLabel("Buscando recompras")).toBe("Recompras");
    expect(shortLabel("Leyendo")).toBe("Leyendo");
  });
});
