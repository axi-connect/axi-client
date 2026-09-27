"use client";

import { Check } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { readinessHeadline, type ProductReadiness } from "@/modules/catalog/domain/product-readiness";

const DOT = { destructive: "bg-destructive", warning: "bg-warning", neutral: "bg-muted-foreground/50" } as const;

/**
 * La isla de la ficha (catálogo premium F3, canvas tablero 4): lo que le falta
 * a este producto para que el agente lo venda, cada fila con el ancla de la
 * sección que lo resuelve, y lo que ya está bien en una línea. Es la ÚNICA
 * isla de la pantalla (DS §9.5.1).
 */
export function ProductReadinessIsland({
  readiness,
  canManage,
  className,
}: {
  readiness: ProductReadiness;
  canManage: boolean;
  className?: string;
}) {
  const { items, ready } = readiness;
  const actions = items.filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index).slice(0, 2);

  return (
    <InkIsland label="Para que tu agente lo venda" glow={items.length === 0 ? "ai" : undefined} className={cn("gap-1.5", className)}>
      <Kicker>Para que tu agente lo venda</Kicker>
      <h2 className="font-heading mb-1 text-[1.4rem] leading-tight font-bold tracking-tight text-balance">
        {readinessHeadline(readiness)}
      </h2>
      {items.length > 0 ? (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                className="-mx-1.5 flex min-h-11 items-center gap-3 rounded-xl px-1.5 py-3 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50"
              >
                <span aria-hidden="true" className={cn("mx-1 size-2 shrink-0 rounded-full", DOT[item.tone])} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[0.9rem] leading-snug font-semibold text-pretty">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground" title={item.detail}>
                    {item.detail}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {ready.length > 0 ? (
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" />
          <span className="text-pretty">{ready.join(" · ")}</span>
        </p>
      ) : null}
      {canManage && actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2.5">
          {actions.map((item, index) => (
            <Button key={item.key} asChild variant={index === 0 ? "contrast" : "glass"} className="h-11 flex-auto rounded-full px-5">
              <a href={item.href}>{item.action}</a>
            </Button>
          ))}
        </div>
      ) : null}
    </InkIsland>
  );
}
