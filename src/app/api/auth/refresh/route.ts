import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { http } from "@/services/http"
import type { ApiResponse } from "@/shared/api"
import type { Tokens } from "@/shared/auth/auth.types"

type RefreshResponse = ApiResponse<{ tokens: Tokens }>

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get("refreshToken")?.value
    if (!refreshToken) return NextResponse.json({ success: false }, { status: 401 })

    const backend = await http.post<RefreshResponse>("/auth/refresh", { refreshToken })
    const { accessToken, refreshToken: newRefresh } = backend.data.tokens

    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    })
    if (newRefresh) {
      cookieStore.set("refreshToken", newRefresh, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 401 })
  }
}


