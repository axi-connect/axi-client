import { renderHook } from "@testing-library/react";

import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { goalResponse, pace } from "../../__tests__/fixtures";
import { useGoalChip } from "../use-goal-chip";

const permissions = new Set(["commercial:read"]);
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
const mockCapability = jest.fn(() => true);
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => ({ entitlements: null, loaded: true, hasCapability: () => mockCapability() }),
}));

const load = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  resetCommercialStore();
  load.mockClear();
  permissions.add("commercial:read");
  mockCapability.mockReturnValue(true);
  useCommercialStore.setState({ load });
});

describe("useGoalChip", () => {
  it("con meta y ritmo: «Meta · N %» hacia /comercial", () => {
    useCommercialStore.setState({
      goal: { status: "ready", data: goalResponse, error: null },
      pace: { status: "ready", data: pace, error: null },
    });
    const { result } = renderHook(() => useGoalChip());
    expect(result.current).toEqual({ pct: 63, href: "/comercial" });
  });

  it("sin meta: null (el briefing no pinta chip)", () => {
    useCommercialStore.setState({ goal: { status: "ready", data: { ...goalResponse, goal: null }, error: null } });
    expect(renderHook(() => useGoalChip()).result.current).toBeNull();
  });

  it("sin permiso o sin capacidad: null y sin pedir nada", () => {
    permissions.delete("commercial:read");
    expect(renderHook(() => useGoalChip()).result.current).toBeNull();
    permissions.add("commercial:read");
    mockCapability.mockReturnValue(false);
    expect(renderHook(() => useGoalChip()).result.current).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("mientras carga pide la meta una vez y no pinta nada", () => {
    const { result } = renderHook(() => useGoalChip());
    expect(result.current).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
