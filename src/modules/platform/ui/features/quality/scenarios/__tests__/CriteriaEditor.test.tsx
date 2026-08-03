import { render, screen, fireEvent } from "@testing-library/react";
import { CriteriaEditor } from "../CriteriaEditor";
import { MAX_CRITERIA, type SuccessCriterion } from "../../../../../domain/quality";

describe("CriteriaEditor", () => {
  it("añade un criterio nuevo (default order_created) y respeta el tope de 20", () => {
    const onChange = jest.fn();
    render(<CriteriaEditor value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Añadir criterio" }));
    expect(onChange).toHaveBeenCalledWith([{ kind: "order_created" }]);

    const full = Array.from(
      { length: MAX_CRITERIA },
      (): SuccessCriterion => ({ kind: "no_agent_error" }),
    );
    render(<CriteriaEditor value={full} onChange={onChange} />);
    const addButtons = screen.getAllByRole("button", { name: "Añadir criterio" });
    expect(addButtons[addButtons.length - 1]).toBeDisabled();
  });

  it("muestra en vivo las reglas cruzadas del backend", () => {
    render(
      <CriteriaEditor
        value={[{ kind: "escalated" }, { kind: "not_escalated" }]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "«Escala a humano» y «No escala» son mutuamente excluyentes",
    );
  });

  it("edita el patrón de reply_contains y lo valida en vivo", () => {
    const onChange = jest.fn();
    render(
      <CriteriaEditor value={[{ kind: "reply_contains", pattern: "(a+)+" }]} onChange={onChange} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("cuantificador anidado");

    fireEvent.change(screen.getByLabelText("Patrón del criterio 1"), {
      target: { value: "gracias" },
    });
    expect(onChange).toHaveBeenCalledWith([{ kind: "reply_contains", pattern: "gracias" }]);
  });

  it("quita criterios y pinta los `unknown` como excluidos del guardado", () => {
    const onChange = jest.fn();
    render(
      <CriteriaEditor
        value={[
          { kind: "unknown", raw: { kind: "future_kind" } },
          { kind: "no_agent_error" },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByText(/se excluirá al guardar/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar criterio 2" }));
    expect(onChange).toHaveBeenCalledWith([{ kind: "unknown", raw: { kind: "future_kind" } }]);
  });

  it("en modo disabled no expone añadir/quitar ni inputs editables", () => {
    render(
      <CriteriaEditor
        value={[{ kind: "max_reply_ms", threshold_ms: 3000 }]}
        onChange={jest.fn()}
        disabled
      />,
    );
    expect(screen.queryByRole("button", { name: "Añadir criterio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quitar criterio/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Umbral de latencia del criterio 1")).toBeDisabled();
  });
});
