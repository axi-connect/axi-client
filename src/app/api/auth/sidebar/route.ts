import { cookies } from "next/headers"
import { http } from "@/core/services/http"
import { NextResponse } from "next/server"
import type { ApiResponse } from "@/core/services/api"
import type { SidebarSectionDTO } from "@/shared/components/layout/sidebar/types"

type SidebarResponse = ApiResponse<SidebarSectionDTO[]>

export async function GET() {
  try {
    const res = await http.get<SidebarResponse>("/auth/me/sidebar", undefined, { authenticate: true })
    return NextResponse.json(res.data)
  } catch (e) {
    return NextResponse.json({ message: "Failed to load sidebar" }, { status: 500 })
  }
}