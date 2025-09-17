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