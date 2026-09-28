"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { Fragment, useState } from "react";
import { cn } from "@/core/lib/utils";
import { BentoFigure, BentoLink, BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { share } from "@/modules/catalog/domain/catalog-summary";
import type { useCatalogOverview, OverviewSection } from "@/modules/catalog/infrastructure/hooks/use-catalog-overview";
import { CatalogNextUpIsland } from "./CatalogNextUpIsland";

const n = (value: number) => value.toLocaleString("es-CO");
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** Piezas «a · b · c» que se cortan entre piezas, nunca a mitad de una (DS §9.5). */
function Parts({ parts, className }: { parts: string[]; className?: string }) {
  return (
    <p className={cn("text-xs text-pretty text-muted-foreground", className)}>
      {/* El separador va FUERA de la pieza: es el único punto donde la línea puede cortarse. */}
      {parts.map((part, index) => (
        <Fragment key={part}>
          <span className="whitespace-nowrap">{part}</span>
          {index < parts.length - 1 ? " · " : null}
        </Fragment>
      ))}
    </p>
  );
}

/** Una línea de la ficha que dice de dónde sale la cifra (DESIGN §7.1, regla 4). */
function Source({ children }: { children: React.ReactNode }) {
  return <p className="mt-auto text-xs text-muted-foreground">{children}</p>;
}

function TileSkeleton({ label }: { label: string }) {
  return (
    <BentoTile label={label}>
      <div role="status" aria-label={`Cargando ${label.toLowerCase()}`} className="flex flex-col gap-3">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-3 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
    </BentoTile>
  );
}

/** Lo que no se pudo leer, dicho en su ficha y con reintento: nunca un cero. */
function TileError({ label, what, onRetry }: { label: string; what: string; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <BentoTile label={label}>
      <p role="alert" className="text-sm text-pretty">
        No pudimos leer {what}.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-auto w-fit rounded-full px-4"
        disabled={retrying}
        onClick={() => {
          setRetrying(true);
          onRetry();
          window.setTimeout(() => setRetrying(false), 600);
        }}
      >
        {retrying ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
        Reintentar
      </Button>
    </BentoTile>
  );
}

function section<T>(value: OverviewSection<T>, label: string, what: string, onRetry: () => void) {
  if (value.data !== null) return null;
  if (value.status === "loading") return <TileSkeleton label={label} />;
  return <TileError label={label} what={what} onRetry={onRetry} />;
}

/**
 * El bento del listado (catálogo premium, canvas tablero 1): cuatro fichas de
 * un tema —lo que está en venta, el stock, la búsqueda con IA y la
 * clasificación— y la isla «Lo próximo» anclada a la derecha. Cada cifra dice
 * de dónde sale; si su fuente falla, su ficha lo dice y las demás siguen.
 */
export function ProductsOverview({ overview }: { overview: ReturnType<typeof useCatalogOverview> }) {
  const { summary, enrichment, classification, reloading, reload } = overview;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-3 [&>*]:min-w-0">
      {section(summary, "En tu catálogo", "el resumen de tu catálogo", reload) ??
        (summary.data && (
          <BentoTile
            label="En tu catálogo"
            busy={reloading}
            aside={<StatePill tone="success">{`${n(summary.data.products.active)} activos`}</StatePill>}
          >
            <BentoFigure value={n(summary.data.products.active)} unit="en venta" />
            <Parts
              parts={[
                `${n(summary.data.products.physical)} ${plural(summary.data.products.physical, "producto", "productos")}`,
                `${n(summary.data.products.services)} ${plural(summary.data.products.services, "servicio agendable", "servicios agendables")}`,
              ]}
            />
            <Source>
              {summary.data.products.inactive > 0
                ? `${n(summary.data.products.inactive)} ${plural(summary.data.products.inactive, "inactivo", "inactivos")}: tu agente no ${plural(summary.data.products.inactive, "lo", "los")} ofrece`
                : "Todos activos: tu agente puede ofrecerlos"}
            </Source>
          </BentoTile>
        ))}

      {section(summary, "Stock de los productos", "el stock", reload) ??
        (summary.data && <StockTile summary={summary.data} busy={reloading} />)}

      <CatalogNextUpIsland
        summary={summary}
        onRetry={reload}
        className="md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1"
      />

      {section(enrichment, "Búsqueda con IA", "el estado de la búsqueda con IA", reload) ??
        (enrichment.data && <EnrichmentTile stats={enrichment.data} busy={reloading} />)}

      {section(classification, "Clasificación", "la clasificación de tus productos", reload) ??
        (classification.data && (
          <BentoTile label="Clasificación" busy={reloading} aside={<BentoLink href="/catalog/categories">Ver categorías</BentoLink>}>
            <BentoFigure
              value={n(classification.data.categorized)}
              unit={`de ${n(classification.data.products)} con categoría`}
            />
            <Parts
              parts={[
                `${n(classification.data.automatic)} ${plural(classification.data.automatic, "automática", "automáticas")} por confirmar`,
                `${n(Math.max(0, classification.data.products - classification.data.categorized))} sin categoría`,
              ]}
            />
            <Source>
              {classification.data.tenant_set > 0
                ? `${n(classification.data.tenant_set)} ${plural(classification.data.tenant_set, "la fijaste", "las fijaste")} tú`
                : "las pone la clasificación automática"}
            </Source>
          </BentoTile>
        ))}
    </div>
  );
}

function StockTile({
  summary,
  busy,
}: {
  summary: NonNullable<ReturnType<typeof useCatalogOverview>["summary"]["data"]>;
  busy: boolean;
}) {
  const { ok, low, out, untracked } = summary.stock;
  const physical = ok + low + out + untracked;
  if (physical === 0) {
    return (
      <BentoTile label="Stock de los productos" busy={busy}>
        <p className="text-sm text-pretty">Aún no tienes productos físicos activos.</p>
        <Source>los servicios no manejan stock</Source>
      </BentoTile>
    );
  }
  const available = physical - out;
  return (
    <BentoTile
      label="Stock de los productos"
      busy={busy}
      aside={
        out > 0 ? (
          <StatePill tone="warning">{`${n(out)} ${plural(out, "agotado", "agotados")}`}</StatePill>
        ) : (
          <StatePill tone="success">Todo disponible</StatePill>
        )
      }
    >
      <BentoFigure value={n(available)} unit={`de ${n(physical)} ${plural(available, "disponible", "disponibles")}`} />
      <Parts
        parts={[
          `${n(out)} ${plural(out, "agotado", "agotados")}`,
          `${n(low)} con una variante agotada`,
          ...(untracked > 0 ? [`${n(untracked)} sin control de stock`] : []),
        ]}
      />
      <Source>los servicios no manejan stock</Source>
    </BentoTile>
  );
}

function EnrichmentTile({
  stats,
  busy,
}: {
  stats: NonNullable<ReturnType<typeof useCatalogOverview>["enrichment"]["data"]>;
  busy: boolean;
}) {
  const toGenerate = Math.max(0, stats.products - stats.ready - stats.failed - stats.disabled);
  const parts = [
    ...(toGenerate > 0 ? [`${n(toGenerate)} por generar`] : []),
    ...(stats.failed > 0 ? [`${n(stats.failed)} no se ${plural(stats.failed, "pudo", "pudieron")}`] : []),
    ...(stats.disabled > 0 ? [`${n(stats.disabled)} ${plural(stats.disabled, "desactivado", "desactivados")}`] : []),
  ];
  return (
    <BentoTile
      label="Búsqueda con IA"
      busy={busy}
      aside={
        <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
          <Sparkles aria-hidden="true" className="size-3.5 text-accent-violet" />
          no consume tu plan
        </span>
      }
    >
      <BentoFigure value={n(stats.ready)} unit={`de ${n(stats.products)} ${plural(stats.ready, "listo", "listos")}`} />
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label="Productos con búsqueda con IA lista"
        aria-valuemin={0}
        aria-valuemax={stats.products}
        aria-valuenow={stats.ready}
      >
        <div className="h-full rounded-full bg-accent-violet" style={{ width: `${share(stats.ready, stats.products)}%` }} />
      </div>
      {parts.length > 0 ? <Parts parts={parts} /> : <p className="text-xs text-muted-foreground">Todo generado</p>}
      <Source>
        {!stats.enabled
          ? "La búsqueda con IA está apagada en la plataforma"
          : stats.monthly_used !== null
            ? `este mes: ${n(stats.monthly_used)} de ${n(stats.monthly_cap)} generaciones`
            : "tu agente la usa para encontrar lo que piden"}
      </Source>
    </BentoTile>
  );
}
