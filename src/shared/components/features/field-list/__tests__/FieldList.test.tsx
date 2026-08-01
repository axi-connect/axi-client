import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FieldList } from "../FieldList";

describe("FieldList", () => {
  it("oculta por defecto los campos vacíos", () => {
    render(
      <FieldList
        items={[
          { label: "Teléfono", value: "+57 300 123 4567" },
          { label: "Ciudad", value: null },
          { label: "Dirección", value: "   " },
          { label: "Email", value: undefined },
        ]}
      />,
    );

    expect(screen.getByText("Teléfono")).toBeInTheDocument();
    expect(screen.queryByText("Ciudad")).not.toBeInTheDocument();
    expect(screen.queryByText("Dirección")).not.toBeInTheDocument();
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
  });

  it("mantiene el campo vacío si hideWhenEmpty es false", () => {
    render(<FieldList items={[{ label: "Ciudad", value: null, hideWhenEmpty: false }]} />);
    expect(screen.getByText("Ciudad")).toBeInTheDocument();
  });

  it("no trata 0 ni false como vacío", () => {
    render(
      <FieldList
        items={[
          { label: "Pedidos", value: 0 },
          { label: "Activo", value: <span>no</span> },
        ]}
      />,
    );
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("no renderiza nada si todos los campos están vacíos", () => {
    const { container } = render(
      <FieldList items={[{ label: "Ciudad", value: null }, { label: "Email", value: "" }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("copia al portapapeles el valor crudo, no el formateado", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <FieldList
        items={[{ label: "Teléfono", value: "+57 300 123 4567", copyable: "+573001234567" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copiar teléfono" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("+573001234567"));
  });

  it("no pinta botón de copiado sin copyable", () => {
    render(<FieldList items={[{ label: "Origen", value: "Conversación" }]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
