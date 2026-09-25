import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));
jest.mock("../../../../infrastructure/api/hooks/use-support-sessions", () => ({
  useIssueSupportSession: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import { SupportSessionDialog } from "../SupportSessionDialog";

function open() {
  render(<SupportSessionDialog open onOpenChange={() => {}} tenant={{ id: "t1", name: "La Espiga" }} />);
}

describe("SupportSessionDialog", () => {
  it("un atajo escribe el comienzo del motivo y otro lo cambia sin perder el detalle", () => {
    open();
    const reason = screen.getByLabelText(/Motivo/) as HTMLTextAreaElement;
    fireEvent.click(screen.getByRole("button", { name: "Catálogo" }));
    expect(reason.value).toBe("Reviso el catálogo: ");
    expect(screen.getByRole("button", { name: "Catálogo" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(reason, { target: { value: "Reviso el catálogo: los combos no cotizan" } });
    fireEvent.click(screen.getByRole("button", { name: "Pagos" }));
    expect(reason.value).toBe("Configuro el primer medio de pago: los combos no cotizan");
    expect(screen.getByRole("button", { name: "Catálogo" })).toHaveAttribute("aria-pressed", "false");
  });

  it("la duración se elige entre 15, 30 y 60 minutos (60 por defecto)", () => {
    open();
    expect(screen.getByRole("radio", { name: "60 min" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "15 min" }));
    expect(screen.getByRole("radio", { name: "15 min" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "60 min" })).toHaveAttribute("aria-checked", "false");
  });

  it("dice lo que soporte no puede hacer, incluidos clientes y facturación (A8)", () => {
    open();
    for (const text of ["Escribir a sus clientes", "Tocar su suscripción o facturación", "Tocar usuarios ni contraseñas"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
