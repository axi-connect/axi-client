/**
 * Storage de la sesión de plataforma: `sessionStorage` (sobrevive a F5, no a
 * cerrar el navegador) + espejo en memoria de módulo. El middleware del
 * cliente API lee SOLO la memoria (sin tocar storage por request); el
 * provider hidrata la memoria desde storage al montar.
 *
 * Excepción sancionada a la regla "tokens solo en cookies HttpOnly"
 * (architecture.md §8): el panel platform no comparte el BFF de tenant.
 */
import { PLATFORM_STORAGE_KEYS, type PlatformSession } from "../../domain/auth";

type StoredSession = PlatformSession & { token: string };

let memory: StoredSession | null = null;

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

/** Token en memoria para el header `Authorization` (null si no hay sesión). */
export function getPlatformToken(): string | null {
  return memory?.token ?? null;
}

/** Sesión en memoria (email + expiración), sin exponer el token. */
export function getPlatformSession(): PlatformSession | null {
  if (!memory) return null;
  return { email: memory.email, expiresAt: memory.expiresAt };
}

/** ¿La sesión en memoria sigue vigente? */
export function isPlatformSessionAlive(now = Date.now()): boolean {
  return memory !== null && memory.expiresAt > now;
}

/** Guarda la sesión en memoria y `sessionStorage` (login / re-login). */
export function savePlatformSession(session: StoredSession): void {
  memory = session;
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.token, session.token);
  window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.exp, String(session.expiresAt));
  window.sessionStorage.setItem(PLATFORM_STORAGE_KEYS.email, session.email);
}

/** Borra la sesión de memoria y storage (logout / token inválido). */
export function clearPlatformSession(): void {
  memory = null;
  if (!storageAvailable()) return;
  window.sessionStorage.removeItem(PLATFORM_STORAGE_KEYS.token);
  window.sessionStorage.removeItem(PLATFORM_STORAGE_KEYS.exp);
  window.sessionStorage.removeItem(PLATFORM_STORAGE_KEYS.email);
}

/**
 * Hidrata la memoria desde `sessionStorage` (mount del provider, tras F5).
 * Devuelve la sesión restaurada, `{ email }` con `expiresAt: 0` si el token
 * ya venció (para pre-llenar el ReLoginModal) o `null` si nunca hubo sesión.
 */
export function restorePlatformSession(now = Date.now()): PlatformSession | null {
  if (!storageAvailable()) return null;
  const token = window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.token);
  const exp = Number(window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.exp));
  const email = window.sessionStorage.getItem(PLATFORM_STORAGE_KEYS.email);
  if (!email) return null;

  if (token && Number.isFinite(exp) && exp > now) {
    memory = { token, email, expiresAt: exp };
    return { email, expiresAt: exp };
  }

  // Token vencido o corrupto: se conserva el email para el re-login.
  memory = null;
  window.sessionStorage.removeItem(PLATFORM_STORAGE_KEYS.token);
  window.sessionStorage.removeItem(PLATFORM_STORAGE_KEYS.exp);
  return { email, expiresAt: 0 };
}
