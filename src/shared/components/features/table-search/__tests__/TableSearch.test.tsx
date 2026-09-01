import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { WandSparkles } from "lucide-react";

import { TableSearch, type TableSearchSuggestion } from "../TableSearch";

/**
 * Lo que blindan estos tests es la SEMÁNTICA y el teclado, que es lo único que
 * un buscador no puede tener a medias: si el ratón funciona y las flechas no,
 * el control es inservible para media plantilla y nadie lo nota mirando.
 *
 * Y un caso concreto que ya costó una tarde en `LocationSearch`: elegir con el
 * ratón tiene que ir por `mousedown`, porque el blur del input cierra el panel
 * antes de que un `click` llegue a soltarse.
 */

const chosen: string[] = [];

function suggestion(id: string, label: string): TableSearchSuggestion {
  return { id, label, detail: "Chapinero", onSelect: () => chosen.push(id) };
}

function Harness({
  suggestions = [suggestion("a", "Kokoa & Co"), suggestion("b", "Kokoro Sushi")],
  withAction = false,
}: {
  suggestions?: TableSearchSuggestion[];
  withAction?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <TableSearch
      value={value}
      onValueChange={setValue}
      suggestions={value.length > 0 ? suggestions : []}
      actions={
        withAction
          ? [
              {
                id: "enrich",
                label: "Buscar datos de los 2",
                icon: WandSparkles,
                hint: "⏎",
                onSelect: () => chosen.push("enrich"),
              },
            ]
          : []
      }
    />
  );
}

beforeEach(() => {
  chosen.length = 0;
});

describe("TableSearch · semántica", () => {
  it("es un combobox que anuncia su lista, no un input suelto", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("no abre el panel al enfocar si no hay nada escrito", () => {
    // Un panel vacío al enfocar es ruido: tapa la tabla para no decir nada.
    render(<Harness />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("al escribir anuncia la lista y marca la primera opción", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
  });
});

describe("TableSearch · teclado", () => {
  it("las flechas mueven el resaltado y Enter elige", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(chosen).toEqual(["b"]);
  });

  it("las flechas no se salen de la lista por ninguno de los dos extremos", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  });

  it("Escape cierra el panel", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("al cambiar el texto el resaltado vuelve arriba", () => {
    // Si no, Enter elige la tercera coincidencia de la búsqueda ANTERIOR.
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.change(input, { target: { value: "kokor" } });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });
});

describe("TableSearch · ratón", () => {
  it("elige con `mousedown`, no con `click`", () => {
    // El blur del input cierra el panel antes de que un `click` se suelte: con
    // `onClick` la opción no se elegía nunca.
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.mouseDown(screen.getByText("Kokoro Sushi"));
    expect(chosen).toEqual(["b"]);
  });

  it("pasar por encima mueve el resaltado del teclado", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.mouseEnter(screen.getByText("Kokoro Sushi"));
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  });
});

describe("TableSearch · acciones y estados", () => {
  it("las acciones se pueden recorrer con el teclado igual que las coincidencias", () => {
    render(<Harness withAction />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(chosen).toEqual(["enrich"]);
  });

  it("sin coincidencias lo dice, en vez de dejar el panel en blanco", () => {
    render(<Harness suggestions={[]} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("Sin coincidencias")).toBeInTheDocument();
  });

  it("limpiar deja el campo vacío y NO cierra el buscador", () => {
    // Limpiar es para volver a escribir: cerrar obligaría a enfocar otra vez.
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "koko" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Limpiar la búsqueda" }));
    expect(input).toHaveValue("");
  });

  it("la caja de limpiar no existe si no hay nada escrito", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: "Limpiar la búsqueda" })).toBeNull();
  });
});
