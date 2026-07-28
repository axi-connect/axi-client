"use client";

/**
 * Header glass del panel de plataforma: breadcrumb propio HUMANIZADO
 * (labels de PLATFORM_NAV + sub-segmentos en español + nombre del tenant
 * resuelto de la caché de TanStack, sin requests extra) + trigger del
 * sidebar + toggle de tema. Mismo lenguaje que `PrivateHeader`.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SidebarTrigger } from "@/shared/components/layout/sidebar/core";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import { PLATFORM_NAV } from "../../domain/navigation";
import { useTenantQuery } from "../../infrastructure/api/hooks/use-tenants";

/** Labels por segmento bajo /platform (top-level desde el nav + sub-tabs del detalle). */
const LABELS: Record<string, string> = {
  ...Object.fromEntries(
    PLATFORM_NAV.filter((item) => item.path !== "/platform").map((item) => [
      item.path.split("/").pop() as string,
      item.label,
    ]),
  ),
  new: "Nuevo tenant",
  users: "Usuarios",
  plan: "Plan & Límites",
  database: "Base de datos",
  // "audit" bajo un tenant y en el top-level comparten label ("Auditoría").
};

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Crumb de un tenant: UUID → nombre. Solo se monta en rutas de tenant, donde
 * la query de la lista YA está activa (misma key que el header del detalle)
 * → reactivo y sin requests extra. Fallback: id corto mientras carga.
 */
function TenantCrumb({ id }: { id: string }) {
  const { data: tenant } = useTenantQuery(id);
  return <>{tenant?.name ?? `${id.slice(0, 8)}…`}</>;
}

export function PlatformHeader() {
  const pathname = usePathname();

  // Crumbs relativos a /platform: en la raíz solo se muestra "Plataforma".
  const parts = pathname.replace(/^\/platform\/?/, "").split("/").filter(Boolean);
  const crumbs = parts.map((seg, idx) => ({
    href: "/platform/" + parts.slice(0, idx + 1).join("/"),
    label: UUID_LIKE.test(seg) ? <TenantCrumb id={seg} /> : LABELS[seg] || seg,
  }));

  return (
    <div className="glass sticky top-0 z-40 py-2">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        <SidebarTrigger />
        <nav aria-label="Breadcrumb" className="min-w-0 text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li className={cn(crumbs.length > 0 && "hidden sm:block")}>
              {crumbs.length === 0 ? (
                <span className="text-foreground">Plataforma</span>
              ) : (
                <Link prefetch={false} href="/platform" className="transition-colors hover:text-foreground">
                  Plataforma
                </Link>
              )}
            </li>
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={c.href} className={cn("items-center gap-2", isLast ? "flex" : "hidden sm:flex")}>
                  <ChevronRight className={cn("h-4 w-4", isLast && "hidden sm:block")} />
                  {isLast ? (
                    <span className="truncate text-foreground">{c.label}</span>
                  ) : (
                    <Link prefetch={false} href={c.href} className="transition-colors hover:text-foreground">
                      {c.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
