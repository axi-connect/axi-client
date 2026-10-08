import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { PlanListItem } from "../../../../domain/plan";
import { PlanFormSheet } from "../PlanFormSheet";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

const createMutateAsync = jest.fn();
const updateMutateAsync = jest.fn();
jest.mock("../../../../infrastructure/api/hooks/use-plans", () => ({
  useCreatePlan: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdatePlan: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}));

// El DetailSheet real usa portal + framer-motion; para el form basta el contenido.
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({ open, title, children }: { open: boolean; title?: React.ReactNode; children?: React.ReactNode }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

const PLAN: PlanListItem = {
  id: "p-1",
  code: "sbs_pro",
  name: "SBS Pro",
  description: null,
  tier: "sbs",
  kind: "package",
  public_slug: null,
  self_service: false,
  default_limits: [],
  storage_quota_bytes: 15 * 1024 ** 3,
  is_active: true,
  subscriptions_count: 12,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

describe("PlanFormSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("en edición, código y tier quedan bloqueados con el hint de inmutabilidad", () => {
    render(<PlanFormSheet open onOpenChange={() => {}} plan={PLAN} />);

    expect(screen.getByLabelText(/código/i)).toBeDisabled();
    expect(screen.getByLabelText("Tier del plan")).toHaveAttribute("data-disabled");
    expect(screen.getAllByText(/inmutable tras la creación/i).length).toBeGreaterThanOrEqual(2);
  });

  it("usage/plan_code_taken → error inline en código y el drawer sigue abierto", async () => {
    createMutateAsync.mockRejectedValueOnce(
      new HttpError({ status: 409, code: "usage/plan_code_taken", message: "code taken" }),
    );
    const onOpenChange = jest.fn();
    render(<PlanFormSheet open onOpenChange={onOpenChange} plan={null} />);

    fireEvent.change(screen.getByLabelText(/código/i), { target: { value: "sbs_pro" } });
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "SBS Pro" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(screen.getByText("Este código ya existe en la plataforma.")).toBeInTheDocument(),
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("creación exitosa envía el DTO y cierra el drawer", async () => {
    createMutateAsync.mockResolvedValueOnce({ id: "p-9" });
    const onOpenChange = jest.fn();
    render(<PlanFormSheet open onOpenChange={onOpenChange} plan={null} />);

    fireEvent.change(screen.getByLabelText(/código/i), { target: { value: "starter" } });
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Starter" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "starter",
        name: "Starter",
        tier: "sbs",
        default_limits: [],
        storage_quota_bytes: null,
      }),
    );
  });

  it("en edición muestra la cuota en GB y un atajo la cambia; viaja en bytes", async () => {
    updateMutateAsync.mockResolvedValueOnce(undefined);
    render(<PlanFormSheet open onOpenChange={() => {}} plan={PLAN} />);

    const input = screen.getByLabelText("Almacenamiento incluido en GB");
    expect(input).toHaveValue("15");
    expect(screen.getByRole("button", { name: "15 GB" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "40 GB" }));
    expect(input).toHaveValue("40");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "p-1",
        body: expect.objectContaining({ storage_quota_bytes: 40 * 1024 ** 3 }),
      }),
    );
  });

  it("«Sin límite» envía null y el texto con coma decimal se respeta", async () => {
    updateMutateAsync.mockResolvedValue(undefined);
    render(<PlanFormSheet open onOpenChange={() => {}} plan={PLAN} />);

    fireEvent.change(screen.getByLabelText("Almacenamiento incluido en GB"), { target: { value: "2,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenLastCalledWith({
        id: "p-1",
        body: expect.objectContaining({ storage_quota_bytes: Math.round(2.5 * 1024 ** 3) }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Sin límite" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenLastCalledWith({
        id: "p-1",
        body: expect.objectContaining({ storage_quota_bytes: null }),
      }),
    );
  });
});
