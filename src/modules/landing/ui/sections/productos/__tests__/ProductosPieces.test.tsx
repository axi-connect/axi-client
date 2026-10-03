/**
 * «Pieza por pieza» (plan productos_juego §4): las siete piezas llegan en el
 * HTML, el router abre una pestaña con su evento, un clic reescribe el hash y
 * las cifras de ejemplo cuadran entre sí.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";

import { PIECES, PIECES_SCENE, PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { ProductosPieces } from "../pieces/ProductosPieces";

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- doble de prueba de next/image
  default: (props: Record<string, unknown>) => <img {...(props as object)} />,
}));

/** `wide` decide el modo: true → escritorio fijado; false → móvil deslizable. */
function mockMedia(wide: boolean) {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({
    matches: q.includes("min-width") ? wide : false,
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeAll(() => {
  // jsdom no implementa el scroll: en escritorio la pieza se alcanza saltando a su altura.
  window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;
  window.IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() })) as unknown as typeof IntersectionObserver;
});

beforeEach(() => {
  window.history.replaceState(null, "", "/productos");
});

const selected = () => screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true");

describe.each([
  ["escritorio", true],
  ["móvil", false],
])("Pieza por pieza · %s", (_label, wide) => {
  beforeEach(() => mockMedia(wide));

  it("pinta las siete piezas como secciones con su id y un dock de siete pestañas", () => {
    const { container } = render(<ProductosPieces />);
    const ids = Array.from(container.querySelectorAll("section[id]")).map((s) => s.id);
    expect(ids).toEqual(PIECES.map((p) => p.id));
    expect(screen.getAllByRole("tab")).toHaveLength(PIECES.length);
    expect(container.querySelector("#piezas-title")?.tagName).toBe("H2");
  });

  it("el evento del router abre su pestaña", () => {
    render(<ProductosPieces />);
    expect(selected()?.textContent).toContain("Bandeja");
    act(() => {
      window.dispatchEvent(new CustomEvent(PIECES_SCENE.event, { detail: { id: "cobros" } }));
    });
    expect(selected()?.getAttribute("aria-controls")).toBe("cobros");
    // Escritorio: salta a la altura de la pestaña (sin scroller de la app, contra window).
    if (wide) expect(window.scrollTo).toHaveBeenCalled();
  });

  it("un id que no es pieza no cambia nada", () => {
    render(<ProductosPieces />);
    act(() => {
      window.dispatchEvent(new CustomEvent(PIECES_SCENE.event, { detail: { id: "precios" } }));
    });
    expect(selected()?.getAttribute("aria-controls")).toBe("inbox");
  });

  it("abre la pieza del hash al montar", () => {
    window.history.replaceState(null, "", "/productos#llamadas");
    render(<ProductosPieces />);
    expect(selected()?.getAttribute("aria-controls")).toBe("llamadas");
  });

  it("un clic cambia la pestaña y reescribe el hash para compartir", () => {
    render(<ProductosPieces />);
    fireEvent.click(screen.getByRole("tab", { name: /CRM/ }));
    expect(selected()?.getAttribute("aria-controls")).toBe("crm");
    expect(window.location.hash).toBe("#crm");
  });

  it("las flechas recorren las pestañas en círculo", () => {
    render(<ProductosPieces />);
    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    expect(selected()?.getAttribute("aria-controls")).toBe("medicion");
    fireEvent.keyDown(list, { key: "Home" });
    expect(selected()?.getAttribute("aria-controls")).toBe("inbox");
  });
});

describe("Pieza por pieza · solo una pieza a la vez en escritorio", () => {
  it("las piezas que no se ven salen del teclado (inert)", () => {
    mockMedia(true);
    const { container } = render(<ProductosPieces />);
    const inert = Array.from(container.querySelectorAll("section[id]")).filter((s) => s.hasAttribute("inert")).map((s) => s.id);
    expect(inert).toEqual(PIECES.filter((p) => p.id !== "inbox").map((p) => p.id));
  });
});

describe("cifras de ejemplo", () => {
  const pesos = (s: string) => Number(s.replace(/[^\d]/g, ""));

  it("la cartera suma lo que dice «Te deben» y lo vencido es lo que está en mora", () => {
    const { rows, owed, overdue } = PIECE_SCREENS.cobros;
    const total = rows.reduce((sum, r) => sum + pesos(r.amount), 0);
    expect(total).toBe(pesos(owed.replace(",", "")) * 100_000);
    const enMora = rows.filter((r) => /mora/i.test(r.state)).reduce((sum, r) => sum + pesos(r.amount), 0);
    expect(enMora).toBe(pesos(overdue));
  });

  it("la calidad general es la media de sus cuatro notas", () => {
    const { quality, subscores } = PIECE_SCREENS.medicion;
    const media = subscores.reduce((s, x) => s + x.value, 0) / subscores.length;
    expect(Math.round(media)).toBe(quality);
  });

  it("el embudo solo se estrecha y termina en las ventas pagadas", () => {
    const { funnel, flow } = PIECE_SCREENS.medicion;
    funnel.slice(1).forEach((step, i) => expect(step.value).toBeLessThanOrEqual(funnel[i].value));
    expect(flow).toContain(`${funnel[funnel.length - 1].value} pagadas`);
  });

  it("la llamada de ejemplo es saliente (las entrantes solo toman recado)", () => {
    expect(PIECE_SCREENS.llamadas.who).toMatch(/^Axi llamó a /);
  });
});
