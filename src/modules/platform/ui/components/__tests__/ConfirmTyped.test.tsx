import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmTyped } from "../ConfirmTyped";

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

function setup(onConfirm = jest.fn()) {
  render(
    <ConfirmTyped
      open
      onOpenChange={() => {}}
      title="Suspender «Acme Corp»"
      description={<p>Se bloqueará el login de todos los usuarios del tenant.</p>}
      confirmText="Acme Corp"
      actionLabel="Suspender"
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm };
}

describe("ConfirmTyped", () => {
  it("el botón destructivo nace deshabilitado", () => {
    setup();
    expect(screen.getByRole("button", { name: "Suspender" })).toBeDisabled();
  });

  it("no se habilita con un match parcial o distinto", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/para confirmar/i), { target: { value: "Acme" } });
    expect(screen.getByRole("button", { name: "Suspender" })).toBeDisabled();
  });

  it("se habilita solo con el texto exacto y dispara onConfirm", () => {
    const { onConfirm } = setup();
    fireEvent.change(screen.getByLabelText(/para confirmar/i), { target: { value: "Acme Corp" } });

    const action = screen.getByRole("button", { name: "Suspender" });
    expect(action).toBeEnabled();
    fireEvent.click(action);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
