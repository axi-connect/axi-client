import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { TenantWizard } from "../TenantWizard";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert }),
}));

const mutateAsync = jest.fn();
jest.mock("../../../../../infrastructure/api/hooks/use-tenants", () => ({
  useCreateTenant: () => ({ mutateAsync, isPending: false }),
}));

jest.mock("../../../../../infrastructure/api/hooks/use-plans", () => ({
  usePlansQuery: () => ({ data: { data: [] }, isPending: false, isError: false, error: null, refetch: jest.fn() }),
}));

// La validación async de RHF+Zod se ralentiza con la suite completa en
// paralelo: timeouts holgados para que el test no flaquee bajo carga.
const WAIT = { timeout: 5000 };
jest.setTimeout(20_000);

/** Completa el paso 1 (país/moneda/estado ya traen defaults CO/COP/trial). */
async function fillCompanyStep(name = "Acme Corp", nit = "900123456") {
  fireEvent.change(screen.getByLabelText(/nombre de la empresa/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/nit/i), { target: { value: nit } });
  fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
  await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument(), WAIT);
}

async function fillOwnerStep() {
  fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { value: "Ana Ruiz" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@acme.co" } });
  fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: "input" }), { target: { value: "SuperSecreta123!" } });
  fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
  await waitFor(() => expect(screen.getByRole("radiogroup", { name: /plan comercial/i })).toBeInTheDocument(), WAIT);
}

describe("TenantWizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("conserva el borrador al volver atrás", async () => {
    render(<TenantWizard />);
    await fillCompanyStep("Beta Foods", "901987654");

    // Paso 2 → Atrás (sin validar) → el paso 1 conserva lo escrito.
    fireEvent.click(screen.getByRole("button", { name: /atrás/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/nombre de la empresa/i)).toHaveValue("Beta Foods"),
    );
    expect(screen.getByLabelText(/nit/i)).toHaveValue("901987654");
  });

  it("nit_taken regresa al paso 1 con error inline en NIT", async () => {
    mutateAsync.mockRejectedValueOnce(
      new HttpError({ status: 409, code: "identities/nit_taken", message: "NIT already registered" }),
    );
    render(<TenantWizard />);
    await fillCompanyStep();
    await fillOwnerStep();

    // Paso 3: "Sin plan" viene preseleccionado → seguir a revisión.
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /crear tenant/i })).toBeInTheDocument(), WAIT);

    fireEvent.click(screen.getByRole("button", { name: /crear tenant/i }));

    await waitFor(() =>
      expect(screen.getByText("Este NIT ya está registrado en la plataforma.")).toBeInTheDocument(),
    );
    // De vuelta en el paso 1 con el borrador intacto.
    expect(screen.getByLabelText(/nombre de la empresa/i)).toHaveValue("Acme Corp");
    expect(replace).not.toHaveBeenCalled();
  });

  it("alta exitosa: guarda credenciales efímeras y redirige al detalle", async () => {
    mutateAsync.mockResolvedValueOnce({ id: "t-9", owner_user_id: "u-1" });
    render(<TenantWizard />);
    await fillCompanyStep();
    await fillOwnerStep();
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /crear tenant/i })).toBeInTheDocument(), WAIT);

    fireEvent.click(screen.getByRole("button", { name: /crear tenant/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/platform/tenants/t-9"), WAIT);
    const stored = JSON.parse(window.sessionStorage.getItem("axi.platform.pending_credentials") ?? "{}");
    expect(stored).toMatchObject({ tenant_id: "t-9", email: "ana@acme.co", password: "SuperSecreta123!" });
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });
});
