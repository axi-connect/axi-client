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

it("un clic fuera y un scroll lo cierran", () => {
  render(<Menu />);
  fireEvent.click(screen.getByRole("button", { name: "Más" }));
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Más" }));
  fireEvent.scroll(screen.getByTestId("scroller"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
