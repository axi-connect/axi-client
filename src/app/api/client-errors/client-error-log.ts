/**
 * Reglas de la telemetría de errores del cliente (`route.ts` de esta carpeta).
 * Viven fuera del route handler porque Next solo admite exportar los métodos
 * HTTP y su configuración desde un `route.ts`, y los tests las necesitan.
 */
export const MAX_BODY_BYTES = 4096;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 5000;
const KINDS = new Set(["chunk", "boundary", "global"]);

export function sanitizeKind(value: unknown): string {
  return typeof value === "string" && KINDS.has(value) ? value : "unknown";
}

const hits = new Map<string, { count: number; resetAt: number }>();

/** Exportado para los tests: el límite vive en memoria del proceso. */
export function resetClientErrorRateLimit(): void {
  hits.clear();
}

export function allowClientError(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    // Techo de memoria: con demasiadas IPs distintas se empieza de cero antes
    // que dejar crecer el mapa sin fin.
    if (hits.size >= MAX_TRACKED_IPS) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

export function sanitizeText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  return value.slice(0, max);
}

/**
 * Path sin query ni hash y con los segmentos que parecen secretos tapados:
 * de 16 caracteres o más (tokens de un solo uso, ids opacos) o numéricos largos.
 */
export function sanitizePath(value: unknown): string | undefined {
  const raw = sanitizeText(value, 300);
  if (!raw) return undefined;
  const path = raw.split(/[?#]/, 1)[0] ?? "";
  return path
    .split("/")
    .map((seg) => (seg.length >= 16 || /^\d{6,}$/.test(seg) ? ":x" : seg))
    .join("/");
}

/** El asset fallido, solo su path (el hash del chunk dice de qué build era). */
export function sanitizeAsset(value: unknown): string | undefined {
  const raw = sanitizeText(value, 300);
  if (!raw) return undefined;
  try {
    return new URL(raw, "https://axi.invalid").pathname.slice(0, 200);
  } catch {
    return undefined;
  }
}
