import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRiskConfirm, type RiskAction } from "../RiskConfirm";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }));

// El Dialog compartido anima con framer-motion; para el test basta el DOM.
jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_t, tag: string) => {
      const Component = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
        const dom = Object.fromEntries(Object.entries(props).filter(([k]) => !["initial", "animate", "exit", "transition", "onWheelCapture", "onTouchMoveCapture"].includes(k)));
        const Tag = tag as keyof React.JSX.IntrinsicElements;
        return <Tag {...dom}>{children}</Tag>;
      };
      Component.displayName = `motion.${tag}`;
      return Component;
    },
  }),
}));

function Harness({ action }: { action: RiskAction }) {
  const { request, dialog } = useRiskConfirm();
  return (
    <>
      <button type="button" onClick={() => request(action)}>
        Hacerlo
      </button>
      {dialog}
    </>
  );
}

beforeEach(() => showAlert.mockClear());

describe("confirmación por riesgo", () => {
  it("reversible: se hace sin diálogo y el aviso ofrece «Deshacer»", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const undo = jest.fn().mockResolvedValue(undefined);
    render(
      <Harness
        action={{ level: "reversible", title: "Devolver al stock", confirmLabel: "Devolver", run, undo, done: { title: "Número devuelto al stock" } }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hacerlo" }));
    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const alert = showAlert.mock.calls[0][0];
    expect(alert).toMatchObject({ tone: "success", title: "Número devuelto al stock" });
    expect(alert.actions[0].label).toBe("Deshacer");
    act(() => alert.actions[0].onClick());
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("reversible que falla: el error se avisa, no se traga", async () => {
    const run = jest.fn().mockRejectedValue(new Error("boom"));
    render(<Harness action={{ level: "reversible", title: "x", confirmLabel: "x", run, done: { title: "Listo" } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Hacerlo" }));
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })));
  });

  it("importante: diálogo con lo que va a pasar y el botón habilitado sin escribir nada", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    render(
      <Harness
        action={{
          level: "important",
          title: "Guardar la ruta de «Clasificar intención»",
          consequences: ["Cambia el proveedor para TODAS las empresas"],
          confirmLabel: "Guardar la ruta",
          run,
          done: { title: "Ruta guardada" },
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hacerlo" }));
    expect(screen.getByText("Lo que va a pasar")).toBeInTheDocument();
    expect(screen.getByText("Cambia el proveedor para TODAS las empresas")).toBeInTheDocument();
    expect(screen.queryByLabelText(/para confirmar/i)).not.toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Guardar la ruta" });
    expect(confirm).toBeEnabled();
    expect(run).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Lo que va a pasar")).not.toBeInTheDocument());
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Ruta guardada" }));
  });

  it("destructivo: hay que escribir el nombre exacto", () => {
    render(
      <Harness
        action={{ level: "destructive", title: "Suspender «Norte Studio»", confirmLabel: "Suspender", confirmText: "Norte Studio", run: jest.fn() }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hacerlo" }));
    // Se vuelve a buscar el botón tras cada cambio: el mock de framer-motion remonta el diálogo.
    const confirm = () => screen.getByRole("button", { name: "Suspender" });
    expect(confirm()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/para confirmar/i), { target: { value: "norte studio" } });
    expect(confirm()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/para confirmar/i), { target: { value: "Norte Studio" } });
    expect(confirm()).toBeEnabled();
  });

  it("si la acción falla, el diálogo sigue abierto y dice por qué", async () => {
    const run = jest.fn().mockRejectedValue(new Error("La ruta cambió"));
    render(<Harness action={{ level: "important", title: "Mover la fecha de corte", confirmLabel: "Mover", run }} />);
    fireEvent.click(screen.getByRole("button", { name: "Hacerlo" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("La ruta cambió"));
    expect(screen.getByRole("button", { name: "Mover" })).toBeInTheDocument();
    expect(showAlert).not.toHaveBeenCalled();
  });
});
