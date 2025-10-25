import { isPublicPath } from "@/core/config/routes"
import { NextResponse, type NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (isPublicPath(pathname)) return NextResponse.next()

  const access = req.cookies.get("accessToken")?.value
  const refresh = req.cookies.get("refreshToken")?.value

  if (!access && !refresh) {
    const url = req.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|assets|fonts|images).*)"],
}