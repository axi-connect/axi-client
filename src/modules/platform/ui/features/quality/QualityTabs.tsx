"use client";

/**
 * Tabs de la sección Calidad como SEGMENTOS DE RUTA (spec D11): deep-linking
 * directo y back/forward correcto. Crece por fases: F3 añade "Ejecuciones"
 * (primera posición, default) y F5 "Depurador". Terminología: NUNCA "Corridas".
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/core/lib/utils";

const TABS = [
  { label: "Ejecuciones", segment: "runs" },
  { label: "Escenarios", segment: "scenarios" },
  { label: "Suites", segment: "suites" },
  // { label: "Depurador", segment: "debugger" },  ← F5
] as const;

const BASE = "/platform/quality";

export function QualityTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de calidad" className="overflow-x-auto border-b border-border">
      <ul className="flex min-w-max items-center gap-1">
        {TABS.map((tab) => {
          const href = `${BASE}/${tab.segment}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={tab.segment}>
              <Link
                href={href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
