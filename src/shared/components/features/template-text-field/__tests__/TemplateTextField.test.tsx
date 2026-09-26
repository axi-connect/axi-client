import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { TemplateTextField } from "@/shared/components/features/template-text-field/TemplateTextField";

/**
 * El editor de textos con huecos, compartido por las reglas de marketing y las
 * plantillas de recordatorio de cobro.
 *
 * Se prueba lo único que justifica que exista: **insertar `{{variable}}` donde
 * está el cursor y dejar el caret detrás**. Escribirlas a mano es una fuente de
 * erratas que el servidor castiga con un 422, y encadenar dos variables sin que
 * el caret avance obliga a recolocarlo a mano cada vez.
 *
 * Un solo componente sirve a dos funciones, una de ellas ya entregada, así que
 * esto protege a los dos llamadores.
 */
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <TemplateTextField
      value={value}
      onChange={setValue}
      variables={["first_name", "amount"]}
      labels={{ first_name: "Nombre", amount: "Importe" }}
      maxLength={100}
      label="Mensaje"
    />
  );
}

describe("TemplateTextField", () => {
  it("inserta la variable DONDE ESTÁ EL CURSOR, no al final", () => {
    render(<Harness initial="Hola , ¿cómo vas?" />);
    const textarea = screen.getByLabelText("Mensaje") as HTMLTextAreaElement;

    // El cursor justo después de «Hola ».
    textarea.setSelectionRange(5, 5);
    fireEvent.click(screen.getByRole("button", { name: "{{first_name}}" }));

    expect(textarea.value).toBe("Hola {{first_name}}, ¿cómo vas?");
  });

  it("reemplaza lo que estuviera seleccionado", () => {
    render(<Harness initial="Debes MUCHO hoy" />);
    const textarea = screen.getByLabelText("Mensaje") as HTMLTextAreaElement;

    textarea.setSelectionRange(6, 11);
    fireEvent.click(screen.getByRole("button", { name: "{{amount}}" }));

    expect(textarea.value).toBe("Debes {{amount}} hoy");
  });

  it("deja el caret DETRÁS de lo insertado, para poder encadenar", async () => {
    render(<Harness initial="" />);
    const textarea = screen.getByLabelText("Mensaje") as HTMLTextAreaElement;

    fireEvent.click(screen.getByRole("button", { name: "{{first_name}}" }));
    // El caret se recoloca en el siguiente frame, como en el componente.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    expect(textarea.selectionStart).toBe("{{first_name}}".length);

    fireEvent.click(screen.getByRole("button", { name: "{{amount}}" }));
    expect(textarea.value).toBe("{{first_name}}{{amount}}");
  });

  it("cuenta lo que queda, y el error sustituye al contador", () => {
    const { rerender } = render(
      <TemplateTextField
        value="hola"
        onChange={() => undefined}
        variables={["first_name"]}
        labels={{ first_name: "Nombre" }}
        maxLength={100}
        label="Mensaje"
      />,
    );
    expect(screen.getByText("96 caracteres disponibles")).toBeInTheDocument();

    rerender(
      <TemplateTextField
        value="hola"
        onChange={() => undefined}
        variables={["first_name"]}
        labels={{ first_name: "Nombre" }}
        maxLength={100}
        label="Mensaje"
        error="Esa variable no existe"
      />,
    );
    expect(screen.getByText("Esa variable no existe")).toBeInTheDocument();
    expect(
      screen.queryByText(/caracteres disponibles/),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
