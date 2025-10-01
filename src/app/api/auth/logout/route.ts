import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { http } from "@/services/http"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get("refreshToken")?.value
    if (refreshToken) {
      try { await http.post("/auth/logout", { refreshToken }) } catch { /* ignore backend error */ }
    }
    cookieStore.delete("accessToken")
    cookieStore.delete("refreshToken")
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}


