import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlatformLoginForm } from "../PlatformLoginForm";

const login = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("../../../infrastructure/auth/platform-auth.context", () => ({
  usePlatformAuth: () => ({ status: "unauthenticated", expired: false, login }),
}));

describe("login de la consola: errores por campo", () => {
  beforeEach(() => login.mockReset());

  it("vacío: cada campo dice qué le falta, debajo de sí mismo, y no se llama al servidor", async () => {
    render(<PlatformLoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByText("Ingresa tu correo")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-invalid", "true");
    expect(login).not.toHaveBeenCalled();
  });

  it("un correo mal escrito se marca en su campo (el navegador ya no se adelanta)", async () => {
    render(<PlatformLoginForm />);
    expect(screen.getByRole("form")).toHaveAttribute("novalidate");
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "laura@" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secreta" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByText("Correo inválido")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("con los dos campos bien, entra", async () => {
    login.mockResolvedValue(undefined);
    render(<PlatformLoginForm />);
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "laura@axi.dev" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secreta" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("laura@axi.dev", "secreta"));
  });
});
