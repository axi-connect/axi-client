import { PLATFORM_STORAGE_KEYS } from "../../../domain/auth";
import {
  clearPlatformSession,
  getPlatformSession,
  getPlatformToken,
  isPlatformSessionAlive,
  restorePlatformSession,
  savePlatformSession,
} from "../token-storage";

const NOW = 1_800_000_000_000;

describe("token-storage (sesión de plataforma)", () => {
  beforeEach(() => {
    clearPlatformSession();
    window.sessionStorage.clear();
  });

  it("save → memoria y sessionStorage quedan consistentes", () => {
    savePlatformSession({ token: "jwt-1", email: "admin@axi.dev", expiresAt: NOW + 900_000 });

    expect(getPlatformToken()).toBe("jwt-1");
    expect(getPlatformSession()).toEqual({ email: "admin@axi.dev", expiresAt: NOW + 900_000 });
    expect(window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.token)).toBe("jwt-1");
    expect(window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.exp)).toBe(String(NOW + 900_000));
    expect(window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.email)).toBe("admin@axi.dev");
  });

  it("clear → borra memoria y storage", () => {
    savePlatformSession({ token: "jwt-1", email: "admin@axi.dev", expiresAt: NOW + 900_000 });
    clearPlatformSession();

    expect(getPlatformToken()).toBeNull();
    expect(getPlatformSession()).toBeNull();
    expect(window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.token)).toBeNull();
    expect(window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.email)).toBeNull();
  });

  it("isPlatformSessionAlive discrimina por expiración", () => {
    savePlatformSession({ token: "jwt-1", email: "admin@axi.dev", expiresAt: NOW + 1000 });
    expect(isPlatformSessionAlive(NOW)).toBe(true);
    expect(isPlatformSessionAlive(NOW + 1001)).toBe(false);
  });

  it("restore con token vigente → rehidrata memoria (sobrevive F5)", () => {
    window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.token, "jwt-f5");
    window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.exp, String(NOW + 60_000));
    window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.email, "admin@axi.dev");

    const session = restorePlatformSession(NOW);

    expect(session).toEqual({ email: "admin@axi.dev", expiresAt: NOW + 60_000 });
    expect(getPlatformToken()).toBe("jwt-f5");
  });

  it("restore con token vencido → conserva email (expiresAt 0) y purga el token", () => {
    window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.token, "jwt-viejo");
    window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.exp, String(NOW - 1));
    window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.email, "admin@axi.dev");

    const session = restorePlatformSession(NOW);

    expect(session).toEqual({ email: "admin@axi.dev", expiresAt: 0 });
    expect(getPlatformToken()).toBeNull();
    expect(window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.token)).toBeNull();
  });

  it("restore sin sesión previa → null", () => {
    expect(restorePlatformSession(NOW)).toBeNull();
  });
});
