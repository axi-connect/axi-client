"use client";

/**
 * Header glass del panel de plataforma: breadcrumb propio (labels de
 * PLATFORM_NAV) + trigger del sidebar + toggle de tema. Mismo lenguaje que
 * `PrivateHeader`, con labels y raíz (/platform) de la consola.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { SidebarTrigger } from "@/shared/components/layout/sidebar/core";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import { PLATFORM_NAV } from "../../domain/navigation";

/** Labels por segmento bajo /platform (los sub-segmentos llegan en FE2+). */
const LABELS: Record<string, string> = Object.fromEntries(
  PLATFORM_NAV.filter((item) => item.path !== "/platform").map((item) => [
    item.path.split("/").pop() as string,
    item.label,
  ]),
);

export function PlatformHeader() {
  const pathname = usePathname();
  // Crumbs relativos a /platform: en la raíz solo se muestra "Plataforma".
  const parts = pathname.replace(/^\/platform\/?/, "").split("/").filter(Boolean);
  const crumbs = parts.map((seg, idx) => ({
    href: "/platform/" + parts.slice(0, idx + 1).join("/"),
    label: LABELS[seg] || seg,
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
