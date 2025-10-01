export type UserRole = "admin" | "manager" | "user" | string

export interface AuthUser {
  id: number | string
  name: string
  email: string
  role?: UserRole
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ResetPasswordPayload {
  token: string
  password: string
}

export interface SessionResponse {
  isAuthenticated: boolean
  user?: AuthUser
}

export const COOKIE_NAMES = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
} as const