export interface UserRoleEntity {
  id: number
  name: string
  description?: string
  code?: string
  hierarchy_level?: number
  state?: string
}

export interface CompanyEntity {
  id: number
  name: string
  activity_description?: string
  nit?: string
  address?: string
  city?: string
  industry?: string
  isotype?: string | null
}

export interface AuthUser {
  id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  role_id?: number
  company_id?: number
  role?: UserRoleEntity
  company?: CompanyEntity
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