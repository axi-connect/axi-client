import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";

import { useEmailVerification } from "../use-email-verification";

const verifyEmail = jest.fn();
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  verifyEmail: (...args: unknown[]) => verifyEmail(...args),
}));

describe("useEmailVerification", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("sin token queda en «missing» y no llama al backend", () => {
    const { result } = renderHook(() => useEmailVerification(""));

    expect(result.current).toEqual({ status: "missing" });
    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it("llama una sola vez por token aunque el efecto se ejecute dos veces (StrictMode) y honra el resultado", async () => {
    verifyEmail.mockResolvedValue({ verified: true });
    const { result } = renderHook(() => useEmailVerification("tok-1"), { wrapper: StrictMode });

    expect(result.current).toEqual({ status: "verifying" });
    await waitFor(() => expect(result.current).toEqual({ status: "verified" }));
    expect(verifyEmail).toHaveBeenCalledTimes(1);
    expect(verifyEmail).toHaveBeenCalledWith("tok-1");
  });

  it("no descarta la respuesta cuando el componente re-renderiza mientras la petición está en vuelo", async () => {
    let resolve!: (value: { verified: true }) => void;
    verifyEmail.mockReturnValue(
      new Promise<{ verified: true }>((res) => {
        resolve = res;
      }),
    );
    const { result, rerender } = renderHook(() => useEmailVerification("tok-1"));

    rerender();
    rerender();
    await act(async () => {
      resolve({ verified: true });
    });

    expect(result.current).toEqual({ status: "verified" });
    expect(verifyEmail).toHaveBeenCalledTimes(1);
  });

  it("410 verification_expired → «expired»", async () => {
    verifyEmail.mockRejectedValue(
      new HttpError({ status: 410, code: "onboarding/verification_expired", message: "expirado" }),
    );
    const { result } = renderHook(() => useEmailVerification("tok-1"));

    await waitFor(() => expect(result.current).toEqual({ status: "expired" }));
  });

  it("otro error → «error» con un mensaje para el usuario (los 5xx no exponen el texto del backend)", async () => {
    verifyEmail.mockRejectedValue(new HttpError({ status: 500, code: "internal/unexpected", message: "boom" }));
    const { result } = renderHook(() => useEmailVerification("tok-1"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current).toEqual({ status: "error", message: expect.stringMatching(/\S/) });
  });
});
