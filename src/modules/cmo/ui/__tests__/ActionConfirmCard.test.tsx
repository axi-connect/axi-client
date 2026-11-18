import type { ComponentProps } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { UiAction } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { ActionConfirmCard } from "../components/ActionConfirmCard";

/**
 * La tarjeta de confirmación (F3 «Axel OS»). Lo que se protege aquí es lo que
 * un cambio de estilo podría romper sin que nadie lo note: el verbo según el
 * riesgo, que nada se dé por hecho mientras va, que el resultado se anuncie, y
 * que «Confirmar todo» nunca se lleve una R2.
 */

const NOW = Date.parse("2026-11-18T12:00:00.000Z");

function action(patch: Partial<UiAction> = {}): UiAction {
  return {
    id: "a1",
    tool: "catalog_update_product",
    risk: "write",
    summary: "Subir el precio del Kit Hidratante",
    lines: [{ label: "Precio", before: "$ 89.000", after: "$ 95.000" }],
    effects: ["El catálogo del agente usa el precio nuevo desde ya"],
    expires_at: "2026-11-19T12:00:00.000Z",
    phase: "pending",
    text: null,
    busy: null,
    error: null,
    ...patch,
  };
}

function renderCard(actions: UiAction[], handlers: Partial<ComponentProps<typeof ActionConfirmCard>> = {}) {
  const props = {
    onConfirm: jest.fn(),
    onReject: jest.fn(),
    onConfirmAll: jest.fn(),
    ...handlers,
  };
  render(<ActionConfirmCard actions={actions} now={NOW} {...props} />);
  return props;
}

describe("ActionConfirmCard", () => {
  it("R1 pendiente: el diff, lo que va a pasar y «Confirmar» de un toque", () => {
    const { onConfirm, onReject } = renderCard([action()]);
    expect(screen.getByRole("article", { name: "Subir el precio del Kit Hidratante" })).toBeInTheDocument();
    expect(screen.getByText("Precio")).toBeInTheDocument();
    expect(screen.getByText("$ 89.000")).toBeInTheDocument();
    expect(screen.getByText("$ 95.000")).toBeInTheDocument();
    expect(screen.getByText("El catálogo del agente usa el precio nuevo desde ya")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledWith("a1");
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onReject).toHaveBeenCalledWith("a1");
  });

  it("R2 pendiente: «Aprobar», con el riesgo dicho antes del botón y enlazado a él", () => {
    renderCard([action({ risk: "external", summary: "Lanzar la campaña de recompra" })]);
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    const approve = screen.getByRole("button", { name: "Aprobar" });
    expect(approve).toHaveAccessibleDescription(/puede llegar a tus clientes/);
    expect(screen.getByText("Acción externa")).toBeInTheDocument();
  });

  it("mientras va, los botones se deshabilitan y NADA se da por hecho", () => {
    renderCard([action({ busy: "confirm" })]);
    expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descartar" })).toBeDisabled();
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Hecho.")).not.toBeInTheDocument();
    expect(screen.getByText("por confirmar")).toBeInTheDocument();
  });

  it("ejecutada: el texto del resultado, anunciado, y sin botones", () => {
    renderCard([action({ phase: "executed", text: "Listo: el Kit Hidratante quedó en $ 95.000." })]);
    expect(screen.getByRole("status")).toHaveTextContent("Listo: el Kit Hidratante quedó en $ 95.000.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("hecho")).toBeInTheDocument();
  });

  it("sin permiso: el texto del servidor, y se puede descartar pero no confirmar", () => {
    const { onReject } = renderCard([
      action({ phase: "forbidden", text: "Tu rol no puede editar productos. Pídeselo a un administrador." }),
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Tu rol no puede editar productos.");
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onReject).toHaveBeenCalledWith("a1");
  });

  it("fallida, descartada y vencida cuentan su desenlace", () => {
    const { unmount } = render(
      <ActionConfirmCard
        actions={[action({ phase: "failed", text: "El producto ya no existe." })]}
        now={NOW}
        onConfirm={jest.fn()}
        onReject={jest.fn()}
        onConfirmAll={jest.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("El producto ya no existe.");
    unmount();

    renderCard([action({ phase: "rejected" })]);
    expect(screen.getByRole("status")).toHaveTextContent("Descartado. No se cambió nada.");
  });

  it("una pendiente cuyo plazo pasó se pinta vencida, sin botón que no pueda funcionar", () => {
    renderCard([action({ expires_at: "2026-11-18T11:59:00.000Z" })]);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Venció/);
  });

  it("un intento que no llegó deja la acción pendiente y el motivo a la vista", () => {
    renderCard([action({ error: "Sin conexión" })]);
    expect(screen.getByRole("status")).toHaveTextContent("No llegó a confirmarse: Sin conexión");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  describe("agrupada (varias del mismo turno)", () => {
    const three = [
      action({ id: "a1", summary: "Cambio uno" }),
      action({ id: "a2", summary: "Cambio dos" }),
      action({ id: "a3", summary: "Cambio tres" }),
    ];

    it("UNA tarjeta con «3 cambios», cada fila con sus botones y «Confirmar todo»", async () => {
      const { onConfirmAll, onConfirm } = renderCard(three);
      const group = screen.getByRole("region", { name: "3 cambios preparados por Axel" });
      // La lista de primer nivel: cada fila trae además su propia lista de efectos.
      const rows = within(group).getAllByRole("list")[0] as HTMLElement;
      expect(rows.tagName).toBe("OL");
      expect(rows.children).toHaveLength(3);
      expect(within(group).getAllByRole("button", { name: "Confirmar" })).toHaveLength(3);

      fireEvent.click(within(group).getAllByRole("button", { name: "Confirmar" })[1] as HTMLElement);
      expect(onConfirm).toHaveBeenCalledWith("a2");

      // `act` asíncrono: la serie cierra con un setState cuando la promesa termina.
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Confirmar todo" }));
        await Promise.resolve();
      });
      expect(onConfirmAll).toHaveBeenCalledWith(["a1", "a2", "a3"]);
    });

    it("«Confirmar todo» deja fuera las R2 y lo dice", async () => {
      const { onConfirmAll } = renderCard([
        action({ id: "a1" }),
        action({ id: "a2" }),
        action({ id: "a3", risk: "external" }),
      ]);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Confirmar los 2 internos" }));
        await Promise.resolve();
      });
      expect(onConfirmAll).toHaveBeenCalledWith(["a1", "a2"]);
      expect(screen.getByRole("button", { name: "Aprobar" })).toBeInTheDocument();
    });

    it("sin dos R1 pendientes no hay «Confirmar todo»", () => {
      renderCard([action({ id: "a1" }), action({ id: "a2", phase: "executed", text: "Hecho." })]);
      expect(screen.queryByRole("button", { name: /Confirmar todo/ })).not.toBeInTheDocument();
    });
  });
});
