import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";

/**
 * `portal`: el menú de una fila de tabla se pinta en `document.body`, porque el
 * scroller de la tabla lo recortaría. Lo que se comprueba es lo que cambia al
 * sacarlo del árbol: dónde vive, que un clic DENTRO no cuenta como clic fuera,
 * y que un scroll lo cierra en vez de dejarlo flotando lejos de su fila.
 */

afterEach(cleanup);

function Menu({ onPick = jest.fn(), portal = true }: { onPick?: () => void; portal?: boolean }) {
  return (
    <div data-testid="scroller" style={{ overflow: "auto" }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">Más</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent portal={portal}>
          <DropdownMenuItem onClick={onPick}>Duplicar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

it("con portal, el panel vive en body y no dentro del scroller", () => {
  render(<Menu />);
  fireEvent.click(screen.getByRole("button", { name: "Más" }));

  const menu = screen.getByRole("menu");
  expect(menu.parentElement).toBe(document.body);
  expect(screen.getByTestId("scroller")).not.toContainElement(menu);
  expect(menu.style.position).toBe("fixed");
});

it("sin portal, todo sigue como antes: el panel va junto al disparador", () => {
  render(<Menu portal={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Más" }));

  expect(screen.getByTestId("scroller")).toContainElement(screen.getByRole("menu"));
});

it("un clic en una opción del panel portalado la ejecuta, no cierra el menú antes", () => {
  const onPick = jest.fn();
  render(<Menu onPick={onPick} />);
  fireEvent.click(screen.getByRole("button", { name: "Más" }));

  const item = screen.getByRole("menuitem", { name: "Duplicar" });
  fireEvent.mouseDown(item);
  fireEvent.click(item);

  expect(onPick).toHaveBeenCalledTimes(1);
});

it("un clic fuera lo cierra", () => {
  render(<Menu />);
  fireEvent.click(screen.getByRole("button", { name: "Más" }));
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

/** Una caja como la de `getBoundingClientRect`, sin depender de que jsdom traiga `DOMRect`. */
const box = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect;

describe("al hacer scroll", () => {
  // jsdom no calcula cajas: se simula dónde está el disparador.
  let where: DOMRect;
  beforeEach(() => {
    where = box(100, 100, 32, 32);
    jest.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      return this.getAttribute("role") === "menu" ? box(0, 0, 0, 0) : where;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it("sigue a su disparador mientras se ve: el scroll que provoca el foco en otra fila no lo cierra (P2 fase 2)", () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    where = box(100, 140, 32, 32);
    fireEvent.scroll(screen.getByTestId("scroller"));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    // Se recoloca bajo el disparador: 140 + 32 + 8.
    expect(menu.style.top).toBe("180px");
  });

  it("se cierra cuando el disparador sale de la vista", () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    where = box(100, -80, 32, 32);
    fireEvent.scroll(screen.getByTestId("scroller"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
