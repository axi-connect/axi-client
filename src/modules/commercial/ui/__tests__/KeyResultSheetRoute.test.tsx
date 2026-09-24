import { cleanup, render, screen } from "@testing-library/react";

import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { KeyResultSheetRoute } from "../KeyResultSheetRoute";
import { goalResponse, pace, plan } from "./fixtures";

const permissions = new Set(["commercial:read", "commercial:manage"]);
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => ({ entitlements: null, loaded: true, hasCapability: () => true }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn() }) }));
jest.mock("@/shared/components/features/charts/AreaTrend", () => ({ AreaTrend: () => null }));
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({ title, children, renderFooter }: { title?: React.ReactNode; children?: React.ReactNode; renderFooter?: () => React.ReactNode }) => (
    <div role="dialog" aria-label={typeof title === "string" ? title : undefined}>
      {children}
      <footer>{renderFooter?.()}</footer>
    </div>
  ),
}));

const load = jest.fn().mockResolvedValue(undefined);

afterEach(cleanup);
beforeEach(() => {
  resetCommercialStore();
  load.mockClear();
  permissions.add("commercial:manage");
  useCommercialStore.setState({ load });
});

describe("KeyResultSheetRoute", () => {
  it("una clave que no existe lo dice y no pinta el pie", () => {
    useCommercialStore.setState({ pace: { status: "ready", data: pace, error: null } });
    render(<KeyResultSheetRoute resultKey="ticket" closeBehavior="back" />);
    expect(screen.getByRole("dialog", { name: "Resultado clave" })).toHaveTextContent("Ese resultado no existe.");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("sin meta: lo dice y ofrece definirla a quien puede", () => {
    useCommercialStore.setState({ goal: { status: "ready", data: { ...goalResponse, goal: null }, error: null } });
    const { rerender } = render(<KeyResultSheetRoute resultKey="sales" closeBehavior="back" />);
    expect(screen.getByText(/Aún no hay meta este mes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Definir la meta" })).toHaveAttribute("href", "/comercial/meta");
    permissions.delete("commercial:manage");
    rerender(<KeyResultSheetRoute resultKey="sales" closeBehavior="back" />);
    expect(screen.queryByRole("link", { name: "Definir la meta" })).toBeNull();
  });

  it("por enlace directo carga él y mientras tanto pinta el skeleton", () => {
    render(<KeyResultSheetRoute resultKey="sales" closeBehavior="replace" />);
    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: "Cargando el resultado" })).toBeInTheDocument();
  });

  it("con datos pinta el detalle y el pie, sin volver a cargar", () => {
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      plan: { status: "ready", data: plan, error: null },
      pace: { status: "ready", data: pace, error: null },
    });
    render(<KeyResultSheetRoute resultKey="sales" closeBehavior="back" />);
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "El camino" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver en el CRM/ })).toHaveAttribute("href", "/crm/pipeline");
  });
});
