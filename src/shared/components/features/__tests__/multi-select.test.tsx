import { fireEvent, render, screen } from "@testing-library/react";
import { MultiSelect } from "@/shared/components/features/multi-select";

jest.mock("@/shared/components/ui/popover", () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-open={open}>{children}</div>
  ),
  PopoverAnchor: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children, ...props }: { children: React.ReactNode; id?: string }) => (
    <div data-testid="popover" id={props.id}>
      {children}
    </div>
  ),
}));

const OPTIONS = [
  { label: "Lead", value: "lead" },
  { label: "Oportunidad", value: "opportunity" },
  { label: "Cliente", value: "customer" },
  { label: "Perdido", value: "lost" },
];

const combobox = () => screen.getByRole("combobox", { name: "Etapas" });

describe("MultiSelect", () => {
  // H1 (auditoría 2026-09-28): un <button> dentro de otro rompe la hidratación
  // del HTML del servidor; React lo avisa por console.error. Cero avisos.
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("no anida controles: las «x» y «Quitar N» son hermanos del combobox, no descendientes", () => {
    render(<MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lead", "customer"]} onValueChange={jest.fn()} />);
    const trigger = combobox();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.querySelector("button")).toBeNull();
    for (const name of ["Quitar Lead", "Quitar Cliente", "Quitar 2 seleccionados"]) {
      const control = screen.getByRole("button", { name });
      expect(trigger.contains(control)).toBe(false);
      expect(control.closest("button")).toBe(control);
    }
  });

  it("pinta fichas neutras con una «x» que es un botón real y no abre el menú", () => {
    const onChange = jest.fn();
    render(<MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lead", "customer"]} onValueChange={onChange} />);

    const remove = screen.getByRole("button", { name: "Quitar Lead" });
    expect(remove.className).toContain("place-items-center");
    fireEvent.click(remove);

    expect(onChange).toHaveBeenLastCalledWith(["customer"]);
    expect(combobox()).toHaveAttribute("aria-expanded", "false");
  });

  it("el nombre accesible lo pone el consumidor; el placeholder es el último recurso", () => {
    const { unmount } = render(<MultiSelect options={OPTIONS} placeholder="Cualquier etapa" onValueChange={jest.fn()} />);
    expect(screen.getByRole("combobox", { name: "Cualquier etapa" })).toBeInTheDocument();
    unmount();
    render(<MultiSelect aria-label="Etapas" options={OPTIONS} placeholder="Cualquier etapa" onValueChange={jest.fn()} />);
    expect(screen.getByRole("combobox", { name: "Etapas" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Cualquier etapa" })).not.toBeInTheDocument();
  });

  it("resume el exceso como +N con la lista completa en el título", () => {
    render(
      <MultiSelect
        aria-label="Etapas"
        options={OPTIONS}
        maxCount={2}
        defaultValue={["lead", "opportunity", "customer", "lost"]}
        onValueChange={jest.fn()}
      />,
    );
    expect(screen.getByTitle("Cliente, Perdido")).toHaveTextContent("+2");
  });

  it("«Quitar seleccionados» vacía la selección", () => {
    const onChange = jest.fn();
    render(<MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lead", "customer"]} onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar 2 seleccionados" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByText("Seleccionar opciones")).toBeInTheDocument();
  });

  it("Backspace en la búsqueda vacía quita la última ficha", () => {
    const onChange = jest.fn();
    render(<MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lead", "customer"]} onValueChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("Buscar entre las opciones"), { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith(["lead"]);
  });

  it("vuelve al defaultValue cuando este cambia", () => {
    const { rerender } = render(
      <MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lead"]} onValueChange={jest.fn()} />,
    );
    expect(screen.getByTitle("Lead")).toBeInTheDocument();
    rerender(<MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lost"]} onValueChange={jest.fn()} />);
    expect(screen.queryByTitle("Lead")).not.toBeInTheDocument();
    expect(screen.getByTitle("Perdido")).toBeInTheDocument();
  });

  it("deshabilitado no muestra el botón de vaciar y bloquea la ficha", () => {
    render(<MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lead"]} onValueChange={jest.fn()} disabled />);
    expect(combobox()).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Quitar 1 seleccionado/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar Lead" })).toBeDisabled();
  });

  it("la marca de cada opción va en aria-checked, aparte del ítem activo de cmdk", () => {
    render(<MultiSelect aria-label="Etapas" options={OPTIONS} defaultValue={["lead"]} onValueChange={jest.fn()} />);
    const checked = screen.getAllByRole("option").filter((item) => item.getAttribute("aria-checked") === "true");
    expect(checked.map((item) => item.textContent)).toEqual(["Lead"]);
    expect(screen.getByTestId("popover")).not.toHaveAttribute("role");
  });

  it("«Seleccionar todas» marca solo las opciones habilitadas", () => {
    const onChange = jest.fn();
    render(
      <MultiSelect
        aria-label="Etapas"
        options={[...OPTIONS.slice(0, 2), { label: "Bloqueada", value: "blocked", disabled: true }]}
        onValueChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Seleccionar todas"));
    expect(onChange).toHaveBeenLastCalledWith(["lead", "opportunity"]);
  });
});
