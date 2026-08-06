"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/core/lib/utils";

const BASE = "/marketing/settings";

const TABS = [
  { segment: "", label: "Ajustes" },
  { segment: "templates", label: "Plantillas" },
  { segment: "meta-templates", label: "Plantillas de Meta" },
  { segment: "opt-outs", label: "Bajas" },
] as const;

/**
 * Sub-navegación de la configuración, por SEGMENTO DE RUTA (no por estado
 * local): cada pestaña tiene su propio fetch y su propio estado, así que cada
 * una merece una URL compartible y que el back del navegador funcione.
 *
 * El sidebar del tenant llega hasta este nivel; bajar un cuarto nivel al menú
 * lo llenaría de ruido para cuatro pantallas que solo se tocan al configurar.
 */
export function MarketingSettingsNav({ optOutCount }: { optOutCount?: number | null }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de configuración" className="overflow-x-auto border-b border-border">
      <ul className="flex min-w-max items-center gap-1">
        {TABS.map((tab) => {
          const href = tab.segment === "" ? BASE : `${BASE}/${tab.segment}`;
          const isActive =
            tab.segment === "" ? pathname === BASE : pathname.startsWith(href);
          return (
            <li key={tab.segment}>
              <Link
                href={href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-primary font-medium text-brand"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.segment === "opt-outs" && typeof optOutCount === "number" && (
                  <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                    {optOutCount.toLocaleString("es-CO")}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
