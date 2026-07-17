/**
 * F15 — AuthProvider ante la suspensión de la empresa:
 * - hydrate con `code: auth/company_suspended` → pantalla bloqueante, NUNCA login.
 * - el CustomEvent `COMPANY_SUSPENDED_EVENT` corta una sesión ya autenticada
 *   (frena el tiempo real vía socketManager.halt()).
 * - el "sin sesión" genérico sigue yendo al login (sin regresión).
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import { COMPANY_SUSPENDED_EVENT } from "@/core/api/problem";

const haltMock = jest.fn();
const resetMock = jest.fn();

jest.mock("@/core/realtime/socket-manager", () => ({
  socketManager: {
    halt: (...args: unknown[]) => haltMock(...args),
    reset: (...args: unknown[]) => resetMock(...args),
  },
}));

import { AuthProvider } from "../auth-provider";

const fetchMock = jest.fn();

/** Response mínima (jsdom del proyecto no trae `Response`). */
function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

/** Respuesta del BFF `/api/auth/session`; el resto de endpoints responden 200 vacío. */
function mockSession(body: unknown) {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) return Promise.resolve(jsonResponse(body));
    return Promise.resolve(jsonResponse({}));
  });
}

const originalLocation = window.location;

beforeAll(() => {
  // jsdom no implementa la navegación: se sustituye por un stub inspeccionable.
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...originalLocation, href: "http://localhost/dashboard", pathname: "/dashboard", search: "" },
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", { writable: true, value: originalLocation });
});

beforeEach(() => {
  haltMock.mockReset();
  resetMock.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock as typeof fetch;
  window.location.href = "http://localhost/dashboard";
  window.location.pathname = "/dashboard";
});

describe("AuthProvider — suspensión de empresa (F15)", () => {
  it("hydrate con code auth/company_suspended → pantalla bloqueante sin redirigir al login", async () => {
    mockSession({ isAuthenticated: false, code: "auth/company_suspended" });

    render(
      <AuthProvider>
        <div data-testid="app-content">contenido</div>
      </AuthProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("La empresa está suspendida");
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
    expect(window.location.href).toBe("http://localhost/dashboard"); // sin redirect
    expect(haltMock).toHaveBeenCalled();
  });

  it("el CustomEvent corta una sesión autenticada y frena el tiempo real", async () => {
    mockSession({
      isAuthenticated: true,
      user: { id: "u1", name: "Test", email: "t@t.co", permissions: [], role: { name: "admin" } },
    });

    render(
      <AuthProvider>
        <div data-testid="app-content">contenido</div>
      </AuthProvider>,
    );
    expect(await screen.findByTestId("app-content")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event(COMPANY_SUSPENDED_EVENT));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("La empresa está suspendida");
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
    expect(haltMock).toHaveBeenCalledTimes(1);
  });

  it("sin sesión y SIN code → redirige al login (sin regresión del flujo normal)", async () => {
    mockSession({ isAuthenticated: false });

    render(
      <AuthProvider>
        <div data-testid="app-content">contenido</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(window.location.href).toContain("/auth/login?next=");
    });
    expect(haltMock).not.toHaveBeenCalled();
  });
});
