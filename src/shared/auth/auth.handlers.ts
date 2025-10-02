import { http } from "@/services/http"
import type { ApiResponse } from "../api"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"

type RefreshResponse = ApiResponse<{ accessToken: string; refreshToken: string }>

export const refreshToken = async (cookieStore: ReadonlyRequestCookies) => {
  const refreshToken = cookieStore.get("refreshToken")?.value
  if (!refreshToken) return [{ success: false }, { status: 401 }]

  const backend = await http.post<RefreshResponse>("/auth/refresh", { refresh_token: refreshToken })
  const { accessToken, refreshToken: newRefresh } = backend.data

  cookieStore.set("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60, // 5m
  })

  if (newRefresh) {
    cookieStore.set("refreshToken", newRefresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7d
    })
  }

  return [{ success: true }, { status: 200 }]
}