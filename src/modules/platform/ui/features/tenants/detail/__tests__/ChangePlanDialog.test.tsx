import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { PlanListItem } from "../../../../../domain/plan";
import { ChangePlanDialog } from "../ChangePlanDialog";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

const assignMutateAsync = jest.fn();
jest.mock("../../../../../infrastructure/api/hooks/use-tenant-plan", () => ({
  useAssignTenantPlan: () => ({ mutateAsync: assignMutateAsync, isPending: false }),
}));

const plan = (over: Partial<PlanListItem>): PlanListItem => ({
  id: "p-sbs",
  code: "sbs",
  name: "SBS",
  description: null,
  tier: "sbs",
  default_limits: [],
  is_active: true,
  subscriptions_count: 1,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ...over,
});

jest.mock("../../../../../infrastructure/api/hooks/use-plans", () => ({
  usePlansQuery: () => ({
    data: { data: [plan({}), plan({ id: "p-ent", code: "enterprise", name: "Enterprise", tier: "enterprise" })] },
    isPending: false,
    refetch: jest.fn(),
  }),
}));

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

describe("ChangePlanDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("409 tenant_db/not_active → alert con CTA al tab Base de datos", async () => {
    assignMutateAsync.mockRejectedValueOnce(
      new HttpError({ status: 409, code: "tenant_db/not_active", message: "DB not active" }),
    );
    render(
      <ChangePlanDialog open onOpenChange={() => {}} tenantId="t-1" tenantName="Acme Corp" currentPlanId="p-sbs" />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /enterprise/i }));
    fireEvent.click(screen.getByRole("button", { name: /asignar plan/i }));

    await waitFor(() =>
      expect(screen.getByText(/enterprise requiere una base dedicada activa/i)).toBeInTheDocument(),
    );
    const cta = screen.getByRole("link", { name: /configurar base de datos/i });
    expect(cta).toHaveAttribute("href", "/platform/tenants/t-1/database");
  });

  it("asignación exitosa cierra el diálogo", async () => {
    assignMutateAsync.mockResolvedValueOnce(undefined);
    const onOpenChange = jest.fn();
    render(
      <ChangePlanDialog open onOpenChange={onOpenChange} tenantId="t-1" tenantName="Acme Corp" currentPlanId={null} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /^SBS/i }));
    fireEvent.click(screen.getByRole("button", { name: /asignar plan/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(assignMutateAsync).toHaveBeenCalledWith("p-sbs");
  });

  it("el botón queda deshabilitado si el plan elegido es el vigente", () => {
    render(
      <ChangePlanDialog open onOpenChange={() => {}} tenantId="t-1" tenantName="Acme Corp" currentPlanId="p-sbs" />,
    );
    expect(screen.getByRole("button", { name: /asignar plan/i })).toBeDisabled();
  });
});
