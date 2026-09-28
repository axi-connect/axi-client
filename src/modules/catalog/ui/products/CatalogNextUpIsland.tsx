"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  catalogNextUpHeadline,
  catalogNextUpItems,
  type CatalogNextUpItem,
  type CatalogSummaryDTO,
} from "@/modules/catalog/domain/catalog-summary";
import type { OverviewSection } from "@/modules/catalog/infrastructure/hooks/use-catalog-overview";

const DOT = { destructive: "bg-destructive", warning: "bg-warning" } as const;
const ACTION_CLASS = "h-11 flex-auto rounded-full px-5";

/**
 * «Lo próximo»: la ÚNICA isla del listado (DESIGN-SYSTEM §9.5.1). Lo que
 * impide vender a un producto activo (`domain/catalog-summary.ts`), y cada
 * fila abre el listado filtrado con esos mismos productos (servidor F1: la
 * cifra y el filtro usan el mismo criterio). Mientras el resumen no llega,
 * silueta; si no se pudo leer, lo dice en vez de dar por hecho que todo está
 * listo.
 */
export function CatalogNextUpIsland({
  summary,
  onRetry,
  className,
}: {
  summary: OverviewSection<CatalogSummaryDTO>;
  onRetry: () => void;
  className?: string;
}) {
  if (summary.data === null && summary.status === "loading") {
    return (
      <InkIsland label="Lo próximo" className={cn("gap-4", className)}>
        <div role="status" aria-label="Cargando lo próximo" className="flex flex-col gap-4">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-7 w-56 rounded-lg" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3.5">
              <Skeleton className="h-8 w-9 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-5/6 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </InkIsland>
    );
  }

  if (summary.data === null) {
    return (
      <InkIsland label="Lo próximo" className={cn("gap-2.5", className)}>
        <Kicker>Lo próximo</Kicker>
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance">
          No pudimos revisar tu catálogo
        </h2>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          Hasta leerlo no damos por hecho que todos tus productos se pueden vender.
        </p>
        <div className="min-h-3 flex-1" />
        <Button variant="contrast" className="h-11 w-fit rounded-full px-5" onClick={onRetry}>
          Reintentar
        </Button>
      </InkIsland>
    );
  }

  const items = catalogNextUpItems(summary.data);

  if (items.length === 0) {
    return (
      <InkIsland label="Lo próximo" glow="ai" className={cn("gap-2.5", className)}>
        <Kicker>Lo próximo</Kicker>
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight">{catalogNextUpHeadline(items)}</h2>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          Tus productos activos tienen fotos, stock y categoría. Si a alguno le falta algo para venderse, aparece aquí.
        </p>
      </InkIsland>
    );
  }

  const countWidth = `${String(Math.max(2, ...items.map((item) => item.count.toLocaleString("es-CO").length)))}ch`;

  return (
    <InkIsland label="Lo próximo" className={cn("gap-1.5", className)}>
      <Kicker>Lo próximo</Kicker>
      <h2 className="font-heading mb-1 text-2xl leading-tight font-bold tracking-tight text-balance">
        {catalogNextUpHeadline(items)}
      </h2>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.key}>
            <NextUpRow item={item} countWidth={countWidth} />
          </li>
        ))}
      </ul>
      <div className="min-h-3 flex-1" />
      <div className="flex flex-wrap gap-2.5">
        {items.slice(0, 2).map((item, index) => (
          <Button key={item.key} asChild variant={index === 0 ? "contrast" : "glass"} className={ACTION_CLASS}>
            <Link href={item.href}>{item.action}</Link>
          </Button>
        ))}
      </div>
    </InkIsland>
  );
}

function NextUpRow({ item, countWidth }: { item: CatalogNextUpItem; countWidth: string }) {
  return (
    <Link
      href={item.href}
      className="-mx-1.5 flex min-h-11 items-center gap-3.5 rounded-xl px-1.5 py-3.5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50"
    >
      <span
        className="font-heading flex shrink-0 items-center text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums"
        style={{ width: `max(2.5rem, ${countWidth})` }}
      >
        {item.count.toLocaleString("es-CO")}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.9rem] leading-snug font-semibold text-pretty">{item.title}</span>
        <span className="truncate text-xs text-muted-foreground" title={item.detail}>
          {item.detail}
        </span>
      </span>
      {item.tone !== "neutral" ? (
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[item.tone])} />
      ) : (
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 opacity-50" />
      )}
    </Link>
  );
}
