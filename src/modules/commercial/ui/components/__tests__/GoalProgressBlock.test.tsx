import { act, cleanup, render, screen } from "@testing-library/react";
import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { GoalProgressBlock } from "../GoalProgressBlock";
import { goalResponse, pace } from "../../__tests__/fixtures";

type Ent = { entitlements: null; loaded: boolean; hasCapability: (code: string) => boolean };
const mockEntitlements = jest.fn<Ent, []>(() => ({ entitlements: null, loaded: true, hasCapability: () => true }));
jest.mock("@/modules/commercial/infrastructure/realtime/use-commercial-realtime", () => ({ useCommercialRealtime: () => undefined }));
jest.mock("@/shared/auth/entitlements.hooks", () => ({ useEntitlements: () => mockEntitlements() }));
const permissions = new Set(["commercial:read", "commercial:manage"]);
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
jest.mock("framer-motion", () => ({ useReducedMotion: () => true, animate: () => ({ stop: () => {} }) }));

const load = jest.fn().mockResolvedValue(undefined);

afterEach(cleanup);
beforeEach(() => {
  resetCommercialStore();
  load.mockClear();
  permissions.add("commercial:manage");
  mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => true });
  useCommercialStore.setState({ load });
});

describe("GoalProgressBlock", () => {
  it("al desmontar cancela el reintento de un ritmo caducado (V4)", () => {
    const cancelStaleRetry = jest.fn();
    useCommercialStore.setState({ cancelStaleRetry });
    const { unmount } = render(<GoalProgressBlock />);
    unmount();
    expect(cancelStaleRetry).toHaveBeenCalledTimes(1);
  });

  it("con meta y ritmo pinta la franja con la cifra y «Ver la ruta»", () => {
    act(() => useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      pace: { status: "ready", data: pace, error: null },
    }));
    render(<GoalProgressBlock />);
    expect(screen.getByRole("region", { name: "Tu meta de septiembre" })).toBeInTheDocument();
    expect(screen.getByText("$ 18,9 M")).toBeInTheDocument();
    expect(screen.getByText(/faltan \$ 11,1 M/)).toBeInTheDocument();
    expect(screen.getByText("63 %")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver la ruta/i })).toHaveAttribute("href", "/comercial");
    expect(screen.getByRole("img", { name: /ruta del mes/i })).toBeInTheDocument();
  });

  it("sin meta, una sola línea que lleva a ponerla — solo para quien puede ponerla", () => {
    act(() => useCommercialStore.setState({ goal: { status: "ready", data: { ...goalResponse, goal: null }, error: null } }));
    const { container, rerender } = render(<GoalProgressBlock />);
    expect(screen.getByRole("link", { name: /ponle una meta/i })).toHaveAttribute("href", "/comercial/meta");

    permissions.delete("commercial:manage");
    rerender(<GoalProgressBlock />);
    expect(container).toBeEmptyDOMElement();
  });

  it("con meta y ritmo dice cuánto falta y el estado que se pinta (cumplida gana)", () => {
    act(() => useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      pace: { status: "ready", data: { ...pace, status: "achieved", data_sufficiency: "insufficient", actual_revenue_cents: 3_000_000_000 }, error: null },
    }));
    render(<GoalProgressBlock />);
    expect(screen.getByText("Cumplida")).toBeInTheDocument();
    expect(screen.queryByText(/faltan \$/)).toBeNull();
  });

  it("con error de red, bloqueo o sin capacidad no pinta nada", () => {
    act(() => useCommercialStore.setState({ goal: { status: "error", data: null, error: "red" } }));
    const { container, rerender } = render(<GoalProgressBlock />);
    expect(container).toBeEmptyDOMElement();

    act(() => useCommercialStore.setState({ goal: { status: "ready", data: null, error: null }, blocker: "no_plan" }));
    rerender(<GoalProgressBlock />);
    expect(container).toBeEmptyDOMElement();

    act(() => useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      pace: { status: "error", data: null, error: "red" },
      blocker: null,
    }));
    rerender(<GoalProgressBlock />);
    expect(container).toBeEmptyDOMElement();

    mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => false });
    act(() => useCommercialStore.setState({ pace: { status: "ready", data: pace, error: null } }));
    rerender(<GoalProgressBlock />);
    expect(container).toBeEmptyDOMElement();
    expect(load).not.toHaveBeenCalled();
  });

  it("carga solo cuando la capacidad y el permiso están confirmados", () => {
    mockEntitlements.mockReturnValue({ entitlements: null, loaded: false, hasCapability: () => true });
    const { rerender } = render(<GoalProgressBlock />);
    expect(load).not.toHaveBeenCalled();

    mockEntitlements.mockReturnValue({ entitlements: null, loaded: true, hasCapability: () => true });
    rerender(<GoalProgressBlock />);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
