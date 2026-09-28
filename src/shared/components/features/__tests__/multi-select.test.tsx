import { fireEvent, render, screen } from "@testing-library/react";
import { MultiSelect } from "@/shared/components/features/multi-select";

jest.mock("@/shared/components/ui/popover", () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    <div data-open={open}>{children}</div>
  ),
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

describe("MultiSelect", () => {
  it("pinta fichas neutras con una «x» que es un botón real y no abre el menú", () => {
    const onChange = jest.fn();
    render(<MultiSelect options={OPTIONS} defaultValue={["lead", "customer"]} onValueChange={onChange} />);

    const remove = screen.getByRole("button", { name: "Quitar Lead" });
    expect(remove.tagName).toBe("BUTTON");
    expect(remove.className).toContain("place-items-center");
    fireEvent.click(remove);

    expect(onChange).toHaveBeenLastCalledWith(["customer"]);
    expect(screen.getByRole("combobox", { name: /Seleccionar opciones/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("resume el exceso como +N con la lista completa en el título", () => {
    render(
      <MultiSelect
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
    render(<MultiSelect options={OPTIONS} defaultValue={["lead", "customer"]} onValueChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar 2 seleccionados" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByText("Seleccionar opciones")).toBeInTheDocument();
  });

  it("Backspace en la búsqueda vacía quita la última ficha", () => {
    const onChange = jest.fn();
    render(<MultiSelect options={OPTIONS} defaultValue={["lead", "customer"]} onValueChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("Buscar entre las opciones"), { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith(["lead"]);
  });

  it("vuelve al defaultValue cuando este cambia", () => {
    const { rerender } = render(
      <MultiSelect options={OPTIONS} defaultValue={["lead"]} onValueChange={jest.fn()} />,
    );
    expect(screen.getByTitle("Lead")).toBeInTheDocument();
    rerender(<MultiSelect options={OPTIONS} defaultValue={["lost"]} onValueChange={jest.fn()} />);
    expect(screen.queryByTitle("Lead")).not.toBeInTheDocument();
    expect(screen.getByTitle("Perdido")).toBeInTheDocument();
  });

  it("deshabilitado no muestra el botón de vaciar y bloquea la ficha", () => {
    render(<MultiSelect options={OPTIONS} defaultValue={["lead"]} onValueChange={jest.fn()} disabled />);
    expect(screen.getByRole("combobox", { name: /Seleccionar opciones/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Quitar 1 seleccionado/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar Lead" })).toBeDisabled();
  });

  it("«Seleccionar todas» marca solo las opciones habilitadas", () => {
    const onChange = jest.fn();
    render(
      <MultiSelect
        options={[...OPTIONS.slice(0, 2), { label: "Bloqueada", value: "blocked", disabled: true }]}
        onValueChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Seleccionar todas"));
    expect(onChange).toHaveBeenLastCalledWith(["lead", "opportunity"]);
  });
});
