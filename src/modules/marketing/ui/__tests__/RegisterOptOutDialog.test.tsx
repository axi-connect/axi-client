import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { RegisterOptOutDialog } from "../components/RegisterOptOutDialog";

/**
 * El alta manual de bajas (P1): sin contacto no se envía; habeas data sobre
 * una baja viva es una SUBIDA (aviso propio, no error); una baja manual
 * repetida se explica en el propio modal, no en un aviso genérico.
 */

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/modules/crm/public", () => ({
  ContactPicker: ({ onChange }: { onChange: (c: { id: string; label: string }) => void }) => (
    <button type="button" onClick={() => onChange({ id: "c-1", label: "Mariana Ospina" })}>
      elegir contacto
    </button>
  ),
}));

jest.mock("@/modules/marketing/infrastructure/services/opt-outs-service.adapter", () => ({
  createOptOut: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/marketing/infrastructure/services/opt-outs-service.adapter") as {
  createOptOut: jest.Mock;
};

function setup() {
  const onRegistered = jest.fn();
  const onOpenChange = jest.fn();
  render(<RegisterOptOutDialog open onOpenChange={onOpenChange} onRegistered={onRegistered} />);
  return { onRegistered, onOpenChange, submit: () => screen.getByRole("button", { name: "Registrar baja" }) };
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("RegisterOptOutDialog", () => {
  it("sin contacto no deja registrar", () => {
    const { submit } = setup();
    expect(submit()).toBeDisabled();
  });

  it("habeas data sobre una baja viva avisa que se actualizó", async () => {
    api.createOptOut.mockResolvedValue({ id: "o-1", upgraded: true });
    const { submit, onRegistered, onOpenChange } = setup();
    fireEvent.click(screen.getByText("elegir contacto"));
    fireEvent.click(screen.getByRole("radio", { name: "Habeas data (Ley 1581)" }));
    expect(screen.getByText(/Queda en el registro legal/)).toBeInTheDocument();
    fireEvent.click(submit());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.createOptOut).toHaveBeenCalledWith("c-1", "habeas_data");
    expect(onRegistered).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith({ tone: "success", title: "Baja actualizada a habeas data" });
  });

  it("una baja manual repetida se explica en el modal y no cierra", async () => {
    api.createOptOut.mockRejectedValue(
      new HttpError({ status: 409, code: "marketing/opt_out_already_active", message: "ya" }),
    );
    const { submit, onOpenChange } = setup();
    fireEvent.click(screen.getByText("elegir contacto"));
    fireEvent.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("ya tiene una baja activa");
    expect(submit()).toBeDisabled();
    expect(showAlert).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
