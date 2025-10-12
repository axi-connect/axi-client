import { http } from "@/core/services/http"
import type { ApiResponse } from "@/core/services/api"
import type { AuthUser, Tokens } from "@/shared/auth/auth.types"

type LoginBackendResponse = ApiResponse<{ user: AuthUser; tokens: Tokens }>

export async function loginWithEmail(data: { email: string; password: string }) {
  const res = await http.post<LoginBackendResponse>("/auth/login", data)
  return res.data
}