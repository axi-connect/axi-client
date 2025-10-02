import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { refreshToken } from "@/shared/auth/auth.handlers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const [success, status] = await refreshToken(cookieStore)
    return NextResponse.json(success, status )
  } catch(error) {
    return NextResponse.json({ success: false }, { status: 401 })
  }
}