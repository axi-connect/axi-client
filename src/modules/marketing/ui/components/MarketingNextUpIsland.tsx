"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight, Gauge } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { AutomationDTO } from "@/modules/marketing/domain/automation";
import {
  marketingNextUpHeadline,
  marketingNextUpItems,
  type MarketingNextUpItem,
  type MetaStatus,
} from "@/modules/marketing/domain/next-up";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import type { Section } from "@/modules/marketing/infrastructure/stores/overview.store";

const DOT = { destructive: "bg-destructive", warning: "bg-warning" } as const;
const ACTION_CLASS = "h-11 flex-auto rounded-full px-5";

/** Qué fuente no se pudo leer, en palabras. */
const SOURCE_NAMES: Record<string, string> = {
  automations: "tus reglas",
  promotions: "tus promociones",
  drafts: "tus borradores",
  meta: "tus plantillas de Meta",
};

function unreadPhrase(failed: string[]): string {
  const names = failed.map((source) => SOURCE_NAMES[source]);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

const waiting = (section: Section<unknown>) =>
  section.data === null && (section.status === "idle" || section.status === "loading");

/**
 * «Lo próximo»: la ÚNICA isla del Resumen (DESIGN-SYSTEM §9.5.1). Lo que está a
 * medio camino, en orden de gravedad (`domain/next-up.ts`). Mismo contrato que
 * la del Panel: mientras una fuente que la decide sigue sin respuesta, silueta;
 * sin filas pero con una fuente sin leer, lo dice en vez de dar por hecho que
 * todo está en orden.
 */
export function MarketingNextUpIsland({
  automations,
  promotions,
  drafts,
  meta,
  now,
  canManage,
  onRetry,
  className,
}: {
  automations: Section<AutomationDTO[]>;
  promotions: Section<PromotionDTO[]>;
  drafts: Section<number>;
  meta: Section<MetaStatus | null>;
  now: Date;
  canManage: boolean;
  onRetry: () => void;
  className?: string;
}) {
  if (waiting(automations) || waiting(promotions) || waiting(drafts) || waiting(meta)) {
    return (
      <InkIsland label="Lo próximo" className={cn("gap-4", className)}>
        <div role="status" aria-label="Cargando lo próximo" className="flex flex-col gap-4">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-7 w-52 rounded-lg" />
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

  const items = marketingNextUpItems({
    automations: automations.data,
    promotions: promotions.data,
    drafts: drafts.data,
    // Sin leer ≠ sin número Cloud: `undefined` no pinta filas de Meta; `null` es «no hay número».
    meta: meta.status === "error" && meta.data === null ? undefined : meta.data,
    now,
  });
  const failed = (
    [
      ["automations", automations],
      ["promotions", promotions],
      ["drafts", drafts],
      ["meta", meta],
    ] as const
  )
    .filter(([, section]) => section.status === "error")
    .map(([source]) => source);

  if (items.length === 0 && failed.length > 0) {
    return (
      <InkIsland label="Lo próximo" className={cn("gap-2.5", className)}>
        <Kicker>Lo próximo</Kicker>
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance">No pudimos revisar lo pendiente</h2>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          No pudimos leer {unreadPhrase(failed)}. Hasta leerlo no damos por hecho que todo está en orden.
        </p>
        <div className="min-h-3 flex-1" />
        <Button variant="contrast" className="h-11 w-fit rounded-full px-5" onClick={onRetry}>
          Reintentar
        </Button>
      </InkIsland>
    );
  }

  if (items.length === 0) {
    return (
      <InkIsland label="Lo próximo" glow="ai" className={cn("gap-2.5", className)}>
        <Kicker>Lo próximo</Kicker>
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight">Todo en orden</h2>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          Ninguna regla bloqueada, ninguna plantilla rechazada y ningún borrador esperando. Si algo te necesita, aparece
          aquí.
        </p>
        <div className="min-h-3 flex-1" />
        {canManage ? (
          <Button asChild variant="glass" className="h-11 w-fit px-5">
            <Link href="/marketing/campaigns/new">Nueva campaña</Link>
          </Button>
        ) : null}
      </InkIsland>
    );
  }

  const countWidth = `${String(Math.max(2, ...items.map((item) => (item.count === null ? 0 : String(item.count).length))))}ch`;
  // Dos acciones como mucho: las de las dos filas de arriba, sin repetir destino.
  const actions = items.filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index).slice(0, 2);

  return (
    <InkIsland label="Lo próximo" className={cn("gap-1.5", className)}>
      <Kicker>Lo próximo</Kicker>
      <h2 className="font-heading mb-1 text-2xl leading-tight font-bold tracking-tight">{marketingNextUpHeadline(items)}</h2>
      <ul className="divide-border divide-y">
        {items.slice(0, 4).map((item) => (
          <li key={item.key}>
            <NextUpRow item={item} countWidth={countWidth} />
          </li>
        ))}
      </ul>
      {failed.length > 0 ? (
        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
          <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
          No pudimos leer {unreadPhrase(failed)}.
        </p>
      ) : null}
      <div className="min-h-3 flex-1" />
      {canManage ? (
        <div className="flex flex-wrap gap-2.5">
          {actions.map((item, index) => (
            <Button key={item.key} asChild variant={index === 0 ? "contrast" : "glass"} className={ACTION_CLASS}>
              <Link href={item.href}>{item.action}</Link>
            </Button>
          ))}
        </div>
      ) : null}
    </InkIsland>
  );
}

function NextUpRow({ item, countWidth }: { item: MarketingNextUpItem; countWidth: string }) {
  return (
    <Link
      href={item.href}
      className="-mx-1.5 flex min-h-11 items-center gap-3.5 rounded-xl px-1.5 py-3.5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50"
    >
      <span
        className="font-heading flex shrink-0 items-center text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums"
        style={{ width: `max(2.5rem, ${countWidth})` }}
      >
        {item.count !== null ? (
          item.count.toLocaleString("es-CO")
        ) : (
          <span aria-hidden="true" className="bg-foreground/6 flex size-10 items-center justify-center rounded-xl">
            <Gauge className="size-4.5" />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.9rem] leading-snug font-semibold text-pretty">{item.title}</span>
        <span className="text-muted-foreground truncate text-xs" title={item.detail}>
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
