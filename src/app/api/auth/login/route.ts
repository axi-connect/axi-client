import { cookies } from "next/headers"
import { http } from "@/core/services/http"
import type { ApiResponse } from "@/core/services/api"
import { NextRequest, NextResponse } from "next/server"
import type { AuthUser, LoginPayload, Tokens } from "@/shared/auth/auth.types"

type LoginResponse = ApiResponse<{ user: AuthUser; tokens: Tokens }>

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as LoginPayload
    const backend = await http.post<LoginResponse>("/auth/login", payload)
    const { accessToken, refreshToken } = backend.data.tokens

    const cookieStore = await cookies()
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60, // 15m
    })
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7d
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Credenciales inválidas" }, { status: 401 })
  }
}