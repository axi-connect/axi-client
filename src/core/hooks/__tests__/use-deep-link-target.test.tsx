import { renderHook } from "@testing-library/react";

import { useDeepLinkTarget } from "../use-deep-link-target";

/**
 * El hook que abre un borrador concreto desde el chat de Axel.
 *
 * Lo que importa aquí es que se dispare UNA vez y que al limpiar el parámetro no
 * se lleve por delante el resto de la URL.
 */

let mockParams = new URLSearchParams();
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/marketing/promotions",
  useSearchParams: () => mockParams,
}));

interface Row {
  id: string;
}
const ROWS: Row[] = [{ id: "p1" }, { id: "p2" }];

function setup(query: string, items: Row[] | null = ROWS) {
  mockParams = new URLSearchParams(query);
  const onFound = jest.fn();
  const onMissing = jest.fn();
  const view = renderHook(() =>
    useDeepLinkTarget<Row>("promotion", items, { onFound, onMissing }),
  );
  return { ...view, onFound, onMissing };
}

afterEach(() => {
  jest.clearAllMocks();
  mockParams = new URLSearchParams();
});

describe("useDeepLinkTarget", () => {
  it("encuentra el elemento del enlace y avisa una sola vez", () => {
    const t = setup("promotion=p1");
    expect(t.onFound).toHaveBeenCalledWith({ id: "p1" });

    // Re-render: si volviera a disparar, cerrar el panel lo reabriría al instante
    // porque el parámetro sigue en la URL.
    t.rerender();
    expect(t.onFound).toHaveBeenCalledTimes(1);
  });

  it("con los datos todavía sin cargar NO decide nada", () => {
    const t = setup("promotion=p1", null);
    expect(t.onFound).not.toHaveBeenCalled();
    expect(t.onMissing).not.toHaveBeenCalled();
  });

  it("un id que ya no existe se dice, no se traga", () => {
    const t = setup("promotion=borrada");
    expect(t.onMissing).toHaveBeenCalledWith("borrada");
    expect(t.onFound).not.toHaveBeenCalled();
  });

  it("sin parámetro no hace nada", () => {
    const t = setup("");
    expect(t.onFound).not.toHaveBeenCalled();
    expect(t.onMissing).not.toHaveBeenCalled();
    t.result.current.clear();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("limpiar quita SOLO su parámetro y conserva el resto de la URL", () => {
    const t = setup("promotion=p1&estado=todas&tab=activas");
    t.result.current.clear();

    const [url, options] = mockReplace.mock.calls[0] ?? [];
    const query = new URLSearchParams(String(url).split("?")[1] ?? "");
    expect(query.get("promotion")).toBeNull();
    expect(query.get("estado")).toBe("todas");
    expect(query.get("tab")).toBe("activas");
    // `replace` y no `push`: el enlace ya se consumió y el back del navegador
    // debe volver al chat, no reabrir el panel.
    expect(options).toEqual({ scroll: false });
  });

  it("si era el único parámetro, la URL queda sin interrogante", () => {
    const t = setup("promotion=p1");
    t.result.current.clear();
    expect(mockReplace).toHaveBeenCalledWith("/marketing/promotions", { scroll: false });
  });
});
