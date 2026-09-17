import { fireEvent, render, screen } from "@testing-library/react";

import type { ProductTypeAttributeDTO } from "@/modules/catalog/domain/product-type";
import { AttributeValueInput } from "@/modules/catalog/ui/components/AttributeValueInput";

const attribute = (overrides: Partial<ProductTypeAttributeDTO> = {}): ProductTypeAttributeDTO =>
  ({
    id: "attr-1",
    code: "fecha_servicio",
    label: "Fecha de salida",
    type: "date",
    scope: "variant",
    is_required: false,
    options: null,
    unit: null,
    position: 10,
    ...overrides,
  }) as ProductTypeAttributeDTO;

describe("AttributeValueInput", () => {
  it("un atributo de tipo fecha se pinta con el selector nativo, no con texto libre", () => {
    render(
      <AttributeValueInput attribute={attribute()} id="attr-fecha" value="2027-03-14" onChange={jest.fn()} />,
    );

    const input = screen.getByDisplayValue("2027-03-14");
    expect(input).toHaveAttribute("type", "date");
  });

  it("la fecha viaja en ISO tal cual la da el input: sin conversión ni zona horaria", () => {
    const onChange = jest.fn();
    const { container } = render(
      <AttributeValueInput attribute={attribute()} id="attr-fecha" value={undefined} onChange={onChange} />,
    );

    const input = container.querySelector("#attr-fecha") as HTMLInputElement;
    expect(input.type).toBe("date");
    fireEvent.change(input, { target: { value: "2027-03-14" } });
    expect(onChange).toHaveBeenCalledWith("2027-03-14");
  });

  it("borrar la fecha la deja sin definir, no como cadena vacía", () => {
    const onChange = jest.fn();
    render(<AttributeValueInput attribute={attribute()} id="attr-fecha" value="2027-03-14" onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue("2027-03-14"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("el número sigue siendo numérico y el texto, texto", () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <AttributeValueInput
        attribute={attribute({ type: "number", code: "duracion", label: "Duración" })}
        id="attr-num"
        value={5}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("5"), { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);

    rerender(
      <AttributeValueInput
        attribute={attribute({ type: "text", code: "destino", label: "Destino" })}
        id="attr-txt"
        value="Cocuy"
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Cocuy"), { target: { value: "Salkantay" } });
    expect(onChange).toHaveBeenCalledWith("Salkantay");
  });
});
