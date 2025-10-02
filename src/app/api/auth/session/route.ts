import { cookies } from "next/headers"
import { http } from "@/services/http"
import { NextResponse } from "next/server"
import type { ApiResponse } from "@/shared/api"
import type { AuthUser } from "@/shared/auth/auth.types"
import { refreshToken } from "@/shared/auth/auth.handlers"

type MeResponse = ApiResponse<{ user: AuthUser }>

export async function GET(req: Request) {
  const accessToken = (await cookies()).get("accessToken")?.value
  const _refreshToken = (await cookies()).get("refreshToken")?.value

  if (!accessToken && !_refreshToken) {
    return NextResponse.json({ isAuthenticated: false })
  }

  try {
    const me = await http.get<MeResponse>("/auth/me", undefined, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} })
    return NextResponse.json({ isAuthenticated: true, user: me.data })
  } catch {
    // Try refresh once
    try {
      const cookieStore = await cookies()
      const [success] = await refreshToken(cookieStore)
      if (!success) return NextResponse.json({ isAuthenticated: false })

      const newAccess = cookieStore.get("accessToken")?.value
      if (!newAccess) return NextResponse.json({ isAuthenticated: false })
      
      const me = await http.get<MeResponse>("/auth/me", undefined, { headers: { Authorization: `Bearer ${newAccess}` } })
      return NextResponse.json({ isAuthenticated: true, user: me.data })
    } catch (error) {
      return NextResponse.json({ isAuthenticated: false })
    }
  }
}