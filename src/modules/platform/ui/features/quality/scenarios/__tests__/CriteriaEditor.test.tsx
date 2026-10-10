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

  /**
   * Regresión: el selector de tipo era inoperable en producción (el listado
   * portalado quedaba bajo el panel del `DetailSheet`, ver DESIGN-SYSTEM §4.4).
   * jsdom no evalúa z-index, así que lo que se asegura aquí es el otro medio
   * camino: que abrir el listado y elegir un tipo propague el criterio en
   * blanco correcto. El apilamiento se verifica en navegador.
   */
  it("abre el selector de tipo y cambia el criterio al elegir otro", () => {
    const onChange = jest.fn();
    render(<CriteriaEditor value={[{ kind: "order_created" }]} onChange={onChange} />);

    // Vía teclado: jsdom no implementa `PointerEvent`, así que `fireEvent.pointerDown`
    // llega sin `button` y Radix lo descarta. La ruta de teclado es la misma
    // máquina de estados y de paso cubre la accesibilidad del control.
    const trigger = screen.getByLabelText("Tipo del criterio 1");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const option = screen.getByRole("option", { name: "Respuesta contiene" });
    fireEvent.keyDown(option, { key: "Enter" });

    // El cambio de tipo reinicia los campos requeridos del criterio nuevo.
    expect(onChange).toHaveBeenCalledWith([{ kind: "reply_contains", pattern: "" }]);
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

  describe("criterios de estado real (F0 partes críticas)", () => {
    it("«Pedido creado» edita los SKU exactos y quita la clave al vaciarlos", () => {
      const onChange = jest.fn();
      const { rerender } = render(<CriteriaEditor value={[{ kind: "order_created", min_items: 1 }]} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText("SKU exactos del criterio 1"), {
        target: { value: "SVG-51537005248829, SVG-1" },
      });
      expect(onChange).toHaveBeenLastCalledWith([
        { kind: "order_created", min_items: 1, exact_product_codes: ["SVG-51537005248829", "SVG-1"] },
      ]);

      rerender(
        <CriteriaEditor
          value={[{ kind: "order_created", min_items: 1, exact_product_codes: ["SVG-1"], max_items: 2 }]}
          onChange={onChange}
        />,
      );
      fireEvent.change(screen.getByLabelText("SKU exactos del criterio 1"), { target: { value: " " } });
      expect(onChange).toHaveBeenLastCalledWith([{ kind: "order_created", min_items: 1, max_items: 2 }]);
      fireEvent.change(screen.getByLabelText("Máximo de unidades del criterio 1"), { target: { value: "" } });
      expect(onChange).toHaveBeenLastCalledWith([{ kind: "order_created", min_items: 1, exact_product_codes: ["SVG-1"] }]);
    });

    it("«Cita agendada»: la holgura solo se habilita con hora y se va con ella", () => {
      const onChange = jest.fn();
      const { rerender } = render(<CriteriaEditor value={[{ kind: "appointment_created" }]} onChange={onChange} />);
      expect(screen.getByLabelText("Holgura en minutos del criterio 1")).toBeDisabled();
      expect(screen.getByText("Hora local del negocio. Sin día ni fecha basta con que exista la cita.")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Hora de la cita del criterio 1"), { target: { value: "15:00" } });
      expect(onChange).toHaveBeenLastCalledWith([{ kind: "appointment_created", expected_time: "15:00" }]);

      rerender(
        <CriteriaEditor
          value={[{ kind: "appointment_created", expected_weekday: "jueves", expected_time: "15:00", tolerance_minutes: 180 }]}
          onChange={onChange}
        />,
      );
      expect(screen.getByLabelText("Holgura en minutos del criterio 1")).toBeEnabled();
      fireEvent.change(screen.getByLabelText("Hora de la cita del criterio 1"), { target: { value: "" } });
      expect(onChange).toHaveBeenLastCalledWith([{ kind: "appointment_created", expected_weekday: "jueves" }]);
    });

    it("el día se elige del selector y «Cualquier día» quita la clave", () => {
      const onChange = jest.fn();
      render(<CriteriaEditor value={[{ kind: "appointment_created", expected_weekday: "jueves" }]} onChange={onChange} />);
      fireEvent.keyDown(screen.getByLabelText("Día de la cita del criterio 1"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("option", { name: "sábado" }), { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith([{ kind: "appointment_created", expected_weekday: "sabado" }]);

      fireEvent.keyDown(screen.getByLabelText("Día de la cita del criterio 1"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("option", { name: "Cualquier día" }), { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith([{ kind: "appointment_created" }]);
    });

    it("el selector de tipo ofrece los tres criterios nuevos y no los pinta como ilegibles", () => {
      const onChange = jest.fn();
      render(
        <CriteriaEditor
          value={[{ kind: "no_false_claims" }, { kind: "no_unverified_claims" }, { kind: "confirmed_total_matches_order" }]}
          onChange={onChange}
        />,
      );
      expect(screen.queryByText(/se excluirá al guardar/)).not.toBeInTheDocument();
      fireEvent.keyDown(screen.getByLabelText("Tipo del criterio 1"), { key: "ArrowDown" });
      for (const name of ["Total confirmado = cobrado", "Sin datos sin respaldo", "Sin afirmaciones falsas de estado"]) {
        expect(screen.getByRole("option", { name })).toBeInTheDocument();
      }
      fireEvent.keyDown(screen.getByRole("option", { name: "Total confirmado = cobrado" }), { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith([
        { kind: "confirmed_total_matches_order" },
        { kind: "no_unverified_claims" },
        { kind: "confirmed_total_matches_order" },
      ]);
    });
  });
});
