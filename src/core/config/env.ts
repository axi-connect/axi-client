/**
 * Variables públicas de entorno — única fuente de URLs del backend.
 * Solo valores estrictamente públicos (`NEXT_PUBLIC_*` se filtra al bundle).
 */

/** Origen del backend axi-server (sin prefijo de API). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/** Prefijo global + versión del API REST del backend. */
export const API_PREFIX = "/api/v1";

/** Origen del WebSocket (Socket.IO, path default `/socket.io`, namespaces `/inbox` y `/channels`). */
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "http://localhost:3000";
