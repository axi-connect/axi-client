import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SearchField } from "../search-field";

function setup(props: Partial<React.ComponentProps<typeof SearchField>> = {}) {
  const onChange = jest.fn();
  render(
    <SearchField
      value=""
      onChange={onChange}
      placeholder="Buscar"
      label="Buscar tareas"
      {...props}
    />,
  );
  return { onChange, input: screen.getByRole("searchbox", { name: /buscar tareas/i }) };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  cleanup();
});

describe("SearchField", () => {
  it("teclear comitea UNA vez, al parar", () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "an" } });
    fireEvent.change(input, { target: { value: "ana" } });
    expect(onChange).not.toHaveBeenCalled();

    act(() => void jest.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("ana");
  });

  it("Enter no espera al rebote", () => {
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: "ana" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("ana");
  });

  it("Escape con texto limpia; ya vacío, suelta el foco", () => {
    // Si no soltara, el campo te atrapa y Escape deja de hacer nada.
    const { onChange, input } = setup();

    fireEvent.change(input, { target: { value: "ana" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).toHaveBeenLastCalledWith("");

    input.focus();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(document.activeElement).not.toBe(input);
  });

  it("el botón de limpiar devuelve el foco al campo", () => {
    // Sin esto, el siguiente carácter que teclees se pierde.
    const { onChange, input } = setup();
    fireEvent.change(input, { target: { value: "ana" } });

    fireEvent.click(screen.getByRole("button", { name: /borrar búsqueda/i }));

    expect(onChange).toHaveBeenLastCalledWith("");
    expect(document.activeElement).toBe(input);
  });

  it("el rebote cuenta como espera: entre la tecla y la petición no hay respuesta", () => {
    const { input } = setup();
    const field = input.closest("[aria-busy]");

    fireEvent.change(input, { target: { value: "ana" } });
    expect(field).toHaveAttribute("aria-busy", "true");

    act(() => void jest.advanceTimersByTime(300));
    expect(field).toHaveAttribute("aria-busy", "false");
  });

  it("«/» enfoca el campo y NO se escribe", () => {
    const { input } = setup({ shortcut: true });

    const event = new KeyboardEvent("keydown", { key: "/", cancelable: true });
    act(() => void window.dispatchEvent(event));

    expect(document.activeElement).toBe(input);
    expect(event.defaultPrevented).toBe(true);
  });

  it("«/» dentro de otro campo no roba el foco", () => {
    render(<input aria-label="otro" />);
    const { input } = setup({ shortcut: true });
    const other = screen.getByLabelText("otro");
    other.focus();

    act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "/" })));

    expect(document.activeElement).toBe(other);
    expect(document.activeElement).not.toBe(input);
  });

  it("si el store la vacía desde fuera, el campo lo refleja", () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <SearchField value="ana" onChange={onChange} placeholder="Buscar" label="Buscar tareas" />,
    );
    expect(screen.getByRole("searchbox")).toHaveValue("ana");

    rerender(
      <SearchField value="" onChange={onChange} placeholder="Buscar" label="Buscar tareas" />,
    );
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});
