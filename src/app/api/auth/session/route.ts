import { cookies } from "next/headers"
import { http } from "@/services/http"
import { NextResponse } from "next/server"
import type { ApiResponse } from "@/shared/api"
import type { AuthUser } from "@/shared/auth/auth.types"

type MeResponse = ApiResponse<{ user: AuthUser }>

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("accessToken")?.value
  const refreshToken = cookieStore.get("refreshToken")?.value

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ isAuthenticated: false })
  }

  try {
    const me = await http.get<MeResponse>("/auth/me", undefined, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} })
    return NextResponse.json({ isAuthenticated: true, user: me.data })
  } catch {
    // Try refresh once
    if (!refreshToken) return NextResponse.json({ isAuthenticated: false })
    try {
      const refreshed = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/auth/refresh`, { method: "POST" })
      if (!refreshed.ok) return NextResponse.json({ isAuthenticated: false })
      const newCookies = await cookies()
      const newAccess = newCookies.get("accessToken")?.value
      if (!newAccess) return NextResponse.json({ isAuthenticated: false })
      const me = await http.get<MeResponse>("/auth/me", undefined, { headers: { Authorization: `Bearer ${newAccess}` } })
      return NextResponse.json({ isAuthenticated: true, user: me.data.user })
    } catch {
      return NextResponse.json({ isAuthenticated: false })
    }
  }
}