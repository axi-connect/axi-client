import {
  decodeOpeningParams,
  defaultOpeningHoles,
  encodeOpeningHoles,
  holeFromChoice,
  holeValue,
  renderOpeningPreview,
  resizeOpeningHoles,
  staticValue,
  unresolvedHoles,
  type OpeningHole,
} from "../opening-params";

/**
 * Hotfix 2026-09-29: la plantilla «sesion_en_vivo_v2» del dueño tiene 4 huecos
 * (nombre · negocio del contacto · texto fijo · fecha) y el lote mandaba dos.
 */
describe("opening-params — qué va en cada hueco", () => {
  it("la sugerencia inicial deja los huecos extra sin decidir, y bloquean", () => {
    const holes = defaultOpeningHoles(4);
    expect(holes.map((h) => h.kind)).toEqual(["first_name", "topic", "static", "static"]);
    expect(unresolvedHoles(holes, "")).toEqual([2, 3, 4]);
    expect(unresolvedHoles(holes, "la cotización")).toEqual([3, 4]);
  });

  it("codifica cada hueco como lo espera el servidor, con la fecha escrita como se lee", () => {
    const holes: OpeningHole[] = [
      { kind: "first_name" },
      { kind: "custom_field", code: "empresa" },
      { kind: "static", type: "text", raw: " la lista de planes con precios " },
      { kind: "static", type: "date", raw: `${String(new Date().getFullYear())}-09-30` },
    ];
    expect(unresolvedHoles(holes, "")).toEqual([]);
    expect(encodeOpeningHoles(holes)).toEqual([
      "first_name",
      "custom_field:empresa",
      "static:la lista de planes con precios",
      "static:30 de septiembre",
    ]);
  });

  it("tipos con selector: hora, importe, número, enlace; lo inválido no vale", () => {
    expect(staticValue("time", "15:00")).toBe("3:00 p. m.");
    expect(staticValue("money", "120000")).toBe(`$${String.fromCharCode(160)}120.000`);
    expect(staticValue("number", "1200")).toBe("1.200");
    expect(staticValue("url", "https://axi.co/demo")).toBe("https://axi.co/demo");
    expect(staticValue("url", "axi.co")).toBeNull();
    expect(staticValue("date", "30/09/2026")).toBeNull();
    expect(staticValue("date", "2030-01-05")).toBe("5 de enero de 2030");
    expect(staticValue("text", "con\nsalto")).toBeNull();
    expect(staticValue("text", "x".repeat(201))).toBeNull();
    expect(unresolvedHoles([{ kind: "static", type: "url", raw: "axi.co" }], "")).toEqual([1]);
  });

  it("cambiar de origen conserva lo escrito solo si sigue siendo el mismo tipo", () => {
    const text: OpeningHole = { kind: "static", type: "text", raw: "hola" };
    expect(holeFromChoice("static:text", text)).toEqual(text);
    expect(holeFromChoice("static:date", text)).toEqual({ kind: "static", type: "date", raw: "" });
    expect(holeFromChoice("custom_field", text)).toEqual({ kind: "custom_field", code: "" });
    expect(holeFromChoice("first_name", text)).toEqual({ kind: "first_name" });
  });

  it("al cambiar de plantilla se conserva lo decidido y se completa lo que falte", () => {
    const holes: OpeningHole[] = [{ kind: "full_name" }, { kind: "static", type: "text", raw: "x" }];
    expect(resizeOpeningHoles(holes, 3)).toEqual([...holes, { kind: "static", type: "text", raw: "" }]);
    expect(resizeOpeningHoles(holes, 1)).toEqual([{ kind: "full_name" }]);
  });

  it("de vuelta desde lo guardado: los textos fijos vuelven como texto y lo raro no revienta", () => {
    expect(decodeOpeningParams(["first_name", "static:30 de septiembre", "custom_field:empresa", "raro"])).toEqual([
      { kind: "first_name" },
      { kind: "static", type: "text", raw: "30 de septiembre" },
      { kind: "custom_field", code: "empresa" },
      { kind: "static", type: "text", raw: "" },
    ]);
  });

  it("la vista previa usa la ficha real y marca con «…» lo que falta", () => {
    const sources = {
      first_name: null,
      full_name: "Ana María Gómez",
      company_name: "axi",
      topic: "",
      custom_fields: { empresa: "Celucambio" },
    };
    expect(holeValue({ kind: "first_name" }, sources)).toBe("Ana");
    expect(holeValue({ kind: "custom_field", code: "empresa" }, sources)).toBe("Celucambio");
    expect(holeValue({ kind: "custom_field", code: "ciudad" }, sources)).toBeNull();
    const segments = renderOpeningPreview(
      "Hola {{1}}, por la cuenta de {{2}}. ¿Te sirve el {{3}}?",
      [{ kind: "first_name" }, { kind: "custom_field", code: "empresa" }, { kind: "static", type: "date", raw: "" }],
      sources,
    );
    expect(segments.filter((s) => s.variable).map((s) => s.text)).toEqual(["Ana", "Celucambio", "…"]);
  });
});
