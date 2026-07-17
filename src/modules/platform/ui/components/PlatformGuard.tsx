"use client";

/**
 * Guard binario del panel (no hay RBAC granular): sin sesión → login con
 * `?next`. Si HUBO sesión y venció (F5 con token muerto, 401), NO redirige:
 * deja la vista montada y el ReLoginModal la cubre (spec D1).
 * El guard es UX; la barrera real de seguridad es el backend.
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";

export function PlatformGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = usePlatformAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/platform/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  // Hidratando sessionStorage o redirigiendo: nunca parpadear contenido admin.
  if (status !== "authenticated") {
    return <BrandLoader fullScreen label="Cargando la consola" />;
  }

  return <>{children}</>;
}
