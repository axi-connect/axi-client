/**
 * El refresh es single-flight: el backend ROTA el token en cada uso y dos
 * refresh concurrentes con el mismo token disparan reuse-detection (revoca
 * toda la familia). Estos tests garantizan la deduplicación.
 */
import { HttpError } from "@/core/api/problem";

const postMock = jest.fn();

jest.mock("server-only", () => ({}));
jest.mock("@/core/services/http", () => ({
  http: { post: (...args: unknown[]) => postMock(...args) },
}));

import { refreshSession } from "../auth.handlers";
import { COOKIE_NAMES } from "../auth.types";

type StoredCookie = { value: string };

function makeStore(initial: Record<string, string>) {
  const jar = new Map<string, StoredCookie>(
    Object.entries(initial).map(([k, v]) => [k, { value: v }]),
  );
  return {
    jar,
    get: (name: string) => jar.get(name),
    set: (name: string, value: string) => {
      jar.set(name, { value });
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  };
}

const TOKENS = {
  access_token: "new-access",
  token_type: "Bearer" as const,
  expires_in: 900,
  refresh_token: "new-refresh",
};

beforeEach(() => {
  postMock.mockReset();
});

describe("refreshSession — single-flight", () => {
  it("dos refresh concurrentes con el mismo token → UNA llamada al backend", async () => {
    postMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(TOKENS), 20)),
    );
    const storeA = makeStore({ [COOKIE_NAMES.refreshToken]: "same-token" });
    const storeB = makeStore({ [COOKIE_NAMES.refreshToken]: "same-token" });

    const [a, b] = await Promise.all([
      refreshSession(storeA as never),
      refreshSession(storeB as never),
    ]);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    // Ambos stores quedan con el par rotado.
    expect(storeA.jar.get(COOKIE_NAMES.refreshToken)?.value).toBe("new-refresh");
    expect(storeB.jar.get(COOKIE_NAMES.refreshToken)?.value).toBe("new-refresh");
  });

  it("un refresh tardío con el token YA rotado reutiliza el resultado (ventana de gracia)", async () => {
    postMock.mockResolvedValue(TOKENS);
    const store = makeStore({ [COOKIE_NAMES.refreshToken]: "grace-token" });

    await refreshSession(store as never);
    // Segundo request que aún llevaba la cookie vieja:
    const late = makeStore({ [COOKIE_NAMES.refreshToken]: "grace-token" });
    const result = await refreshSession(late as never);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("reuse-detection (401 auth/refresh_reuse_detected) limpia las cookies", async () => {
    postMock.mockRejectedValue(
      new HttpError({ status: 401, code: "auth/refresh_reuse_detected", message: "revocado" }),
    );
    const store = makeStore({
      [COOKIE_NAMES.accessToken]: "a",
      [COOKIE_NAMES.refreshToken]: "stolen-token",
    });

    const result = await refreshSession(store as never);

    expect(result).toEqual({ ok: false, status: 401, code: "auth/refresh_reuse_detected" });
    expect(store.jar.has(COOKIE_NAMES.accessToken)).toBe(false);
    expect(store.jar.has(COOKIE_NAMES.refreshToken)).toBe(false);
  });

  it("sin cookie de refresh → 401 sin llamar al backend", async () => {
    const store = makeStore({});
    const result = await refreshSession(store as never);

    expect(result.ok).toBe(false);
    expect(postMock).not.toHaveBeenCalled();
  });
});
