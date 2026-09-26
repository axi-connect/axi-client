import { act, renderHook, waitFor } from "@testing-library/react";

import { useOnboardingResume } from "../use-onboarding-resume";
import { emptyProgress } from "@/modules/onboarding/domain/onboarding-progress";
import { resetOnboardingStore } from "@/modules/onboarding/infrastructure/stores/onboarding.store";

const getOnboardingProgress = jest.fn();
const updateOnboardingProgress = jest.fn();
const dismissOnboardingBanner = jest.fn();
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  getOnboardingProgress: (...args: unknown[]) => getOnboardingProgress(...args),
  updateOnboardingProgress: (...args: unknown[]) => updateOnboardingProgress(...args),
  dismissOnboardingBanner: (...args: unknown[]) => dismissOnboardingBanner(...args),
  completeOnboarding: jest.fn(),
  getMyEntitlements: () => Promise.reject(new Error("sin entitlements en este test")),
  resendVerificationEmail: jest.fn(),
}));

const NOW = "2026-09-01T10:00:00Z";

describe("useOnboardingResume", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetOnboardingStore();
  });

  it("mientras carga no decide nada; luego cuenta lo pendiente y lleva al primer paso abierto", async () => {
    getOnboardingProgress.mockResolvedValueOnce({
      ...emptyProgress("c1", NOW),
      steps: { niche: { status: "done", completed_at: NOW }, business_hours: { status: "skipped", completed_at: NOW } },
    });
    const { result } = renderHook(() => useOnboardingResume());
    expect(result.current.state).toBe("loading");

    await waitFor(() => expect(result.current.state).toBe("pending"));
    if (result.current.state !== "pending") throw new Error("esperaba pendiente");
    expect(result.current.pending).toBe(3);
    expect(result.current.next).toEqual({ code: "catalog", label: "Catálogo", status: "pending" });
    expect(result.current.href).toBe("/onboarding?step=catalog");
    expect(result.current.steps.map((step) => step.status)).toEqual(["done", "skipped", "pending", "pending", "pending"]);
  });

  it("terminado u oculto por el usuario, queda oculto", async () => {
    getOnboardingProgress.mockResolvedValueOnce({ ...emptyProgress("c1", NOW), completed_at: NOW });
    const first = renderHook(() => useOnboardingResume());
    await waitFor(() => expect(first.result.current.state).toBe("hidden"));
    first.unmount();

    resetOnboardingStore();
    getOnboardingProgress.mockResolvedValueOnce({ ...emptyProgress("c1", NOW), banner_dismissed_at: NOW });
    const second = renderHook(() => useOnboardingResume());
    await waitFor(() => expect(second.result.current.state).toBe("hidden"));
  });

  it("si el progreso no carga queda oculto: el error no es del Panel", async () => {
    getOnboardingProgress.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useOnboardingResume());
    await waitFor(() => expect(result.current.state).toBe("hidden"));
  });

  it("ocultar lo quita al instante y lo persiste con su endpoint propio", async () => {
    getOnboardingProgress.mockResolvedValueOnce(emptyProgress("c1", NOW));
    dismissOnboardingBanner.mockResolvedValueOnce({ ...emptyProgress("c1", NOW), banner_dismissed_at: NOW });
    const { result } = renderHook(() => useOnboardingResume());
    await waitFor(() => expect(result.current.state).toBe("pending"));

    act(() => {
      if (result.current.state === "pending") result.current.dismiss();
    });
    expect(result.current.state).toBe("hidden");
    await waitFor(() => expect(dismissOnboardingBanner).toHaveBeenCalledTimes(1));
    // Endpoint propio con `companies:read`, no el PUT de edición.
    expect(updateOnboardingProgress).not.toHaveBeenCalled();
  });
});
