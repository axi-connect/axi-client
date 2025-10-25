// config/routes.ts
export const PUBLIC_PATHS = ["/", "/marketplace", "/auth", "/api", "/_next", "/favicon.ico", "/assets", "/fonts", "/images"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}