import { queryView } from "../query-view";

const isEmpty = (rows: number[]) => rows.length === 0;

describe("regla «error ≠ vacío»", () => {
  it("sin datos y con error es un error, NUNCA un vacío (el bug de Proveedores)", () => {
    expect(queryView({ data: undefined, isPending: false, isError: true }, isEmpty)).toEqual({
      view: "error",
      refreshFailed: false,
    });
  });

  it("cargando la primera vez es silueta", () => {
    expect(queryView({ data: undefined, isPending: true, isError: false }, isEmpty).view).toBe("loading");
  });

  it("una lista vacía y sana es un vacío", () => {
    expect(queryView({ data: [], isPending: false, isError: false }, isEmpty).view).toBe("empty");
  });

  it("una lista vacía con el refresco en error no se afirma como vacía", () => {
    expect(queryView({ data: [], isPending: false, isError: true }, isEmpty).view).toBe("error");
  });

  it("con datos y un refresco fallido se conservan los datos y se avisa", () => {
    expect(queryView({ data: [1, 2], isPending: false, isError: true }, isEmpty)).toEqual({
      view: "ready",
      refreshFailed: true,
    });
    expect(queryView({ data: [1], isPending: false, isError: false }, isEmpty)).toEqual({
      view: "ready",
      refreshFailed: false,
    });
  });
});
