import { act, renderHook, waitFor } from "@testing-library/react";

import {
  countActive,
  persistedFiltersKey,
  sanitizeFilterValues,
  usePersistedFilters,
  type FilterSchema,
  type FilterValues,
} from "..";

/** CAP-21 · filtros que sobreviven a la navegación y a la recarga. */

const SCHEMA: FilterSchema = {
  filters: [
    {
      kind: "multi",
      key: "status",
      label: "Estado",
      options: [
        { value: "new", label: "Nuevo" },
        { value: "qualified", label: "Calificado" },
      ],
    },
    {
      kind: "flags",
      key: "require",
      label: "Datos",
      modeKey: "require_mode",
      options: [
        { value: "phone", label: "Teléfono" },
        { value: "email", label: "Correo" },
      ],
    },
    {
      kind: "steps",
      key: "min_score",
      label: "Desde",
      options: [
        { value: null, label: "Cualquiera" },
        { value: 40, label: "40" },
      ],
    },
    { kind: "count", key: "min_data", label: "Datos", max: 6 },
    { kind: "switch", key: "has_dm", label: "Con quien decide" },
    { kind: "text", key: "city", label: "Ciudad" },
    { kind: "date", key: "created", label: "Descubierto", mode: "range" },
  ],
};

const KEY = "axi:captacion:filtros:v1:company-a:user-1";
const NONE: FilterValues = {};
const sanitize = (raw: unknown) => sanitizeFilterValues(SCHEMA, raw);
const isEmpty = (values: FilterValues) => countActive(SCHEMA, values) === 0;

function usePersisted(storageKey: string | null, pending = false) {
  return usePersistedFilters<FilterValues>({ storageKey, pending, initial: NONE, sanitize, isEmpty });
}

afterEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("persistedFiltersKey", () => {
  it("lleva ámbito, versión, empresa y usuario", () => {
    expect(
      persistedFiltersKey({ scope: "captacion:filtros", version: 1, companyId: "company-a", userId: "user-1" }),
    ).toBe(KEY);
  });

  it("sin empresa o sin usuario no hay clave: no se guarda nada sin dueño", () => {
    expect(persistedFiltersKey({ scope: "x", version: 1, companyId: undefined, userId: "u" })).toBeNull();
    expect(persistedFiltersKey({ scope: "x", version: 1, companyId: "c", userId: null })).toBeNull();
  });
});

describe("usePersistedFilters", () => {
  it("guarda al cambiar y restaura al volver a montar", async () => {
    const first = renderHook(() => usePersisted(KEY));
    await waitFor(() => expect(first.result.current.ready).toBe(true));

    act(() => first.result.current.setValue({ status: ["new"], has_dm: true }));
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "null")).toEqual({ status: ["new"], has_dm: true });
    first.unmount();

    const second = renderHook(() => usePersisted(KEY));
    await waitFor(() => expect(second.result.current.ready).toBe(true));
    expect(second.result.current.value).toEqual({ status: ["new"], has_dm: true });
  });

  it("el primer render usa el valor inicial y no lee el almacenamiento (seguro para SSR)", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ status: ["new"] }));
    const seen: FilterValues[] = [];
    renderHook(() => {
      const state = usePersisted(KEY);
      seen.push(state.value);
      return state;
    });
    expect(seen[0]).toEqual({});
  });

  it("no escribe en cada render, solo cuando el valor cambia", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");
    const { result, rerender } = renderHook(() => usePersisted(KEY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.setValue({ status: ["new"] }));
    rerender();
    rerender();
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("vaciar los filtros borra lo guardado", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ status: ["new"] }));
    const { result } = renderHook(() => usePersisted(KEY));
    await waitFor(() => expect(result.current.value).toEqual({ status: ["new"] }));

    act(() => result.current.setValue({}));
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("la clave aísla por empresa: otra empresa no hereda los filtros", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ status: ["new"] }));
    const other = "axi:captacion:filtros:v1:company-b:user-1";
    const { result, rerender } = renderHook(({ key }) => usePersisted(key), { initialProps: { key: KEY } });
    await waitFor(() => expect(result.current.value).toEqual({ status: ["new"] }));

    rerender({ key: other });
    await waitFor(() => expect(result.current.value).toEqual({}));
    expect(window.localStorage.getItem(other)).toBeNull();
    expect(window.localStorage.getItem(KEY)).not.toBeNull();
  });

  it("otra versión de la clave no lee lo de la anterior", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ status: ["new"] }));
    const v2 = persistedFiltersKey({ scope: "captacion:filtros", version: 2, companyId: "company-a", userId: "user-1" });
    const { result } = renderHook(() => usePersisted(v2));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.value).toEqual({});
  });

  it("mientras la sesión carga no está lista y no lee nada", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ status: ["new"] }));
    const { result, rerender } = renderHook(({ pending }) => usePersisted(pending ? null : KEY, pending), {
      initialProps: { pending: true },
    });
    expect(result.current.ready).toBe(false);
    expect(result.current.value).toEqual({});

    rerender({ pending: false });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.value).toEqual({ status: ["new"] });
  });

  it("sin clave funciona como un estado normal y no guarda nada", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => usePersisted(null));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.setValue({ status: ["new"] }));
    expect(result.current.value).toEqual({ status: ["new"] });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("un JSON corrupto se ignora y se limpia", async () => {
    window.localStorage.setItem(KEY, "{no es json");
    const { result } = renderHook(() => usePersisted(KEY));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.value).toEqual({});
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("si localStorage lanza, no rompe: los filtros siguen funcionando en la pantalla", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("bloqueado", "SecurityError");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("bloqueado", "SecurityError");
    });
    const { result } = renderHook(() => usePersisted(KEY));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.setValue({ status: ["new"] }));
    expect(result.current.value).toEqual({ status: ["new"] });
  });

  it("lo guardado que ya no existe se descarta y lo válido sobrevive", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ status: ["new", "borrado"], source: ["viejo"], min_score: 55, city: "Cali" }),
    );
    const { result } = renderHook(() => usePersisted(KEY));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.value).toEqual({ status: ["new"], city: "Cali" });
    // Y lo guardado queda limpio.
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "null")).toEqual({ status: ["new"], city: "Cali" });
  });
});

describe("sanitizeFilterValues", () => {
  it("descarta lo que no es un objeto", () => {
    expect(sanitizeFilterValues(SCHEMA, null)).toBeNull();
    expect(sanitizeFilterValues(SCHEMA, ["new"])).toBeNull();
    expect(sanitizeFilterValues(SCHEMA, "new")).toBeNull();
  });

  it("valida cada tipo contra el esquema vigente", () => {
    expect(
      sanitizeFilterValues(SCHEMA, {
        status: "qualified",
        require: ["phone", "fax"],
        require_mode: "any",
        min_score: "40",
        min_data: 9,
        has_dm: "true",
        city: "   ",
        created: ["2026-11-01", "ayer"],
        extra: "x",
      }),
    ).toEqual({ status: ["qualified"], require: ["phone"], require_mode: "any", min_score: 40 });
  });

  it("conserva un rango de fechas abierto y un conteo dentro del tope", () => {
    expect(sanitizeFilterValues(SCHEMA, { created: ["", "2026-11-20"], min_data: 3 })).toEqual({
      created: ["", "2026-11-20"],
      min_data: 3,
    });
  });
});
