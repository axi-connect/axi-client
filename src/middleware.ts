import { isPublicPath } from "@/core/config/routes"
import { NextResponse, type NextRequest } from "next/server"
import { safeInternalNext } from "@/core/lib/safe-next"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (isPublicPath(pathname)) return NextResponse.next()

  const access = req.cookies.get("accessToken")?.value
  const refresh = req.cookies.get("refreshToken")?.value
  // Acceso de soporte (entrega F3): su cookie también es una sesión válida.
  const support = req.cookies.get("supportAccessToken")?.value

  if (!access && !refresh && !support) {
    const url = req.nextUrl.clone()
    url.pathname = "/auth/login"
    // Saneado: `https://app//evil.com` llega con pathname `//evil.com` (QA H3-1).
    url.searchParams.set("next", safeInternalNext(pathname + req.nextUrl.search, { origin: req.nextUrl.origin, blockedPrefixes: ["/auth"] }))
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|assets|fonts|images).*)"],
}