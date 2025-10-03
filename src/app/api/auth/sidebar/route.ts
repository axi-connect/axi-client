import { cookies } from "next/headers"
import { http } from "@/services/http"
import { NextResponse } from "next/server"
import type { ApiResponse } from "@/shared/api"
import type { SidebarSectionDTO } from "@/components/layout/sidebar/types"

type SidebarResponse = ApiResponse<SidebarSectionDTO[]>

export async function GET() {
  const accessToken = (await cookies()).get("accessToken")?.value
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  try {
    const res = await http.get<SidebarResponse>("/auth/me/sidebar", undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return NextResponse.json(res.data)
  } catch (e) {
    return NextResponse.json({ message: "Failed to load sidebar" }, { status: 500 })
  }
}