// Shared API types

/**
 * Generic API response wrapper used across services.
*/
export interface ApiResponse<T> {
  successful: boolean
  message: string
  data: T
  statusCode: number
}

/**
 * Parses an HTTP error thrown by fetch wrappers to a normalized shape.
 * Accepts Error.message strings like: "HTTP 409: { ...json... }" or plain text.
*/
export function parseHttpError(error: unknown): { status?: number; message?: string } {
  const fallback = { status: undefined, message: "Ocurrió un error inesperado" }
  if (typeof error === "object" && error && "message" in error) {
    const raw = String((error as any).message)
    const match = raw.match(/^HTTP\s+(\d+)/)
    const status = match ? Number(match[1]) : undefined
    const payloadStr = raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : ""
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : undefined
      return { status, message: (payload as any)?.message || (payload as any)?.error || raw }
    } catch {
      return { status, message: raw }
    }
  }
  return fallback
}