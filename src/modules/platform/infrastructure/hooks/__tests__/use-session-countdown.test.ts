import { act, renderHook } from "@testing-library/react";
import { useSessionCountdown } from "../use-session-countdown";

// El hook solo consume `session.expiresAt` del contexto: se mockea el módulo
// para no montar el provider completo (router + QueryClient).
const mockAuth = { session: null as { email: string; expiresAt: number } | null };
jest.mock("../../auth/platform-auth.context", () => ({
  usePlatformAuth: () => mockAuth,
}));

describe("useSessionCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("formatea mm:ss y descuenta por tick", () => {
    mockAuth.session = { email: "admin@axi.dev", expiresAt: Date.now() + 15 * 60 * 1000 };
    const { result } = renderHook(() => useSessionCountdown());

    expect(result.current.mmss).toBe("15:00");
    expect(result.current.warning).toBe(false);

    act(() => jest.advanceTimersByTime(61_000));
    expect(result.current.mmss).toBe("13:59");
  });

  it("activa warning a T−2 min y llega a 0:00 sin negativos", () => {
    mockAuth.session = { email: "admin@axi.dev", expiresAt: Date.now() + 121_000 };
    const { result } = renderHook(() => useSessionCountdown());

    expect(result.current.warning).toBe(false);
    act(() => jest.advanceTimersByTime(2_000));
    expect(result.current.warning).toBe(true);
    expect(result.current.mmss).toBe("1:59");

    act(() => jest.advanceTimersByTime(180_000));
    expect(result.current.mmss).toBe("0:00");
    expect(result.current.msLeft).toBe(0);
    expect(result.current.warning).toBe(false);
  });

  it("sin sesión → 0:00 estable", () => {
    mockAuth.session = null;
    const { result } = renderHook(() => useSessionCountdown());
    expect(result.current.mmss).toBe("0:00");
    expect(result.current.warning).toBe(false);
  });
});
