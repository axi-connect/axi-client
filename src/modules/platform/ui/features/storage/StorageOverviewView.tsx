"use client";

/**
 * /platform/storage (lienzo P1): el disco del servidor, cuánto se prometió en
 * cuotas, quién llena el disco y la tabla de tenants. La isla dice a quién
 * atender. Cada ficha carga y falla por su cuenta; un error nunca es un cero.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Activity, Bell, ChevronRight, Layers } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { BentoFigure, BentoTile, InkIsland, Kicker, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { SearchField } from "@/shared/components/ui/search-field";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  bytesFigure,
  formatBytes,
  humanDays,
  meterTone,
  STATE_LABELS,
  type StorageOrigin,
  type StorageOverview,
  type StorageProviderView,
  type StorageTenantRow,
} from "../../../domain/storage";
import {
  useStorageOverview,
  useStorageTenants,
  type StorageTenantsParams,
} from "../../../infrastructure/api/hooks/use-storage";
import { ago, OriginBar, OriginLegend, Provenance, Sparkline, StorageMeter, TileFailure, TileLoading } from "./parts";

const GRID =
  "grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-3 min-[1400px]:grid-cols-[repeat(3,minmax(0,1fr))_minmax(17rem,20rem)]";
const ISLAND_SLOT = "md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1 min-[1400px]:col-start-4";

function DiskTile({ provider }: { provider: StorageProviderView | undefined }) {
  if (provider === undefined) return null;
  const live = provider.capacity;
  const reference = live ?? provider.last_known;
  const label = `${provider.kind === "physical" ? "Disco del servidor" : "Almacenamiento en la nube"} · ${provider.label}`;
  if (provider.kind === "cloud") {
    return (
      <BentoTile label={label} className="md:col-span-2" aside={<StatePill tone="neutral">Elástico</StatePill>}>
        <BentoFigure {...bytesFigure(provider.ledger_bytes)} />
        <p className="text-sm text-muted-foreground">Sin disco que vigilar: crece con lo que se guarda.</p>
      </BentoTile>
    );
  }
  if (reference === null) {
    return (
      <BentoTile label={label} className="md:col-span-2" aside={<StatePill tone="neutral">Sin lectura</StatePill>}>
        <p className="text-sm font-medium">Aún no hay lectura del disco</p>
        <p className="text-sm text-pretty text-muted-foreground">
          Falta el acceso a las métricas de MinIO (MINIO_METRICS_TOKEN). Las subidas funcionan igual; el freno por
          disco lleno queda suspendido hasta tener lectura.
        </p>
      </BentoTile>
    );
  }
  const usedPct = (reference.used_bytes / reference.total_bytes) * 100;
  const tone = provider.level === "critical" ? "destructive" : provider.level === "warning" ? "warning" : "default";
  const pill =
    live === null ? (
      <StatePill tone="neutral">Sin lectura</StatePill>
    ) : provider.level === "critical" ? (
      <StatePill tone="destructive">Crítico</StatePill>
    ) : provider.level === "warning" ? (
      <StatePill tone="warning">Por llenarse</StatePill>
    ) : (
      <StatePill tone="success">Sano</StatePill>
    );
  const used = provider.trend.map((row) => row.total_bytes - row.free_bytes);
  return (
    <BentoTile label={label} className="md:col-span-2" aside={pill}>
      <BentoFigure
        value={bytesFigure(reference.free_bytes).value}
        unit={`${bytesFigure(reference.free_bytes).unit} libres de ${formatBytes(reference.total_bytes)}${live === null ? ` · ${ago(reference.observed_at)}` : ""}`}
      />
      <StorageMeter pct={usedPct} tone={tone} label="Uso del disco" />
      <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        <span>Usado {formatBytes(reference.used_bytes)}</span>
        <span>Aviso al 80 % · crítico al 90 %</span>
      </div>
      <Sparkline points={used} />
      {provider.growth_per_month_bytes !== null && provider.growth_per_month_bytes > 0 ? (
        <p className="text-sm text-muted-foreground">
          Crece <span className="font-medium text-foreground">≈ {formatBytes(provider.growth_per_month_bytes)} al mes</span>
          {provider.days_to_full !== null ? (
            <>
              . A este ritmo el disco se llena en{" "}
              <span className="font-medium text-foreground">{humanDays(provider.days_to_full)}</span>.
            </>
          ) : (
            "."
          )}
        </p>
      ) : null}
      <Provenance icon={Activity}>
        {live === null
          ? `Sin lectura ahora · último valor ${ago(reference.observed_at)}`
          : `Medido ${ago(live.observed_at)} en el disco · tendencia de los últimos 90 días`}
      </Provenance>
    </BentoTile>
  );
}

function QuotasTile({ overview }: { overview: StorageOverview }) {
  const disk = overview.providers.find((provider) => provider.kind === "physical");
  const total = (disk?.capacity ?? disk?.last_known)?.total_bytes ?? null;
  const ratio = total === null || total === 0 ? null : overview.totals.quota_sum_bytes / total;
  return (
    <BentoTile
      label="Cuotas"
      aside={ratio === null ? undefined : <StatePill tone={ratio > 1.5 ? "warning" : "info"}>×{String(Math.round(ratio * 10) / 10).replace(".", ",")} del disco</StatePill>}
    >
      <BentoFigure size="md" {...bytesFigure(overview.totals.quota_sum_bytes)} unit={`${bytesFigure(overview.totals.quota_sum_bytes).unit} prometidos`} />
      <p className="text-sm text-pretty text-muted-foreground">
        {total === null
          ? "Suma de las cuotas de todos los tenants."
          : `Los tenants tienen derecho a ${formatBytes(overview.totals.quota_sum_bytes)} y el disco mide ${formatBytes(total)}. `}
        Hoy usan <span className="font-medium text-foreground">{formatBytes(overview.totals.tenant_bytes)}</span> entre todos.
      </p>
      <Provenance icon={Layers}>Suma de cuotas de plan y ampliaciones</Provenance>
    </BentoTile>
  );
}

function OriginTile({ overview }: { overview: StorageOverview }) {
  const rows = (["customer", "team", "system"] as const).map((origin) => ({ origin, bytes: overview.by_origin[origin] }));
  const sum = rows.reduce((acc, row) => acc + row.bytes, 0);
  return (
    <BentoTile label="Quién llena el disco" className="md:col-span-2">
      <OriginBar parts={rows.map((row) => ({ origin: row.origin as StorageOrigin, pct: sum === 0 ? 0 : (row.bytes / sum) * 100 }))} />
      <div className="grid gap-x-6 sm:grid-cols-3">
        <OriginLegend rows={rows} />
      </div>
    </BentoTile>
  );
}

function AttentionTile({ overview }: { overview: StorageOverview }) {
  const { tenants, tenants_full, tenants_warning } = overview.totals;
  return (
    <BentoTile label="Tenants al límite">
      <BentoFigure size="md" value={String(tenants_full + tenants_warning)} unit={`de ${String(tenants)}`} />
      <p className="text-sm text-pretty text-muted-foreground">
        {tenants_full > 0 ? (
          <>
            <span className="font-medium text-foreground">{tenants_full} {tenants_full === 1 ? "lleno" : "llenos"}</span>: sus subidas
            del equipo están en pausa.{" "}
          </>
        ) : null}
        {tenants_warning > 0 ? `${String(tenants_warning)} pasan del 80 %.` : tenants_full === 0 ? "Todos tienen espacio." : null}
      </p>
      <Provenance icon={Bell}>Les avisamos al 80 % y al 100 %</Provenance>
    </BentoTile>
  );
}

function NextIsland({ overview }: { overview: StorageOverview }) {
  const attention = overview.attention;
  const disk = overview.providers.find((provider) => provider.kind === "physical");
  const diskAlert = disk !== undefined && (disk.level === "warning" || disk.level === "critical");
  const title =
    attention.length === 0 && !diskAlert
      ? "Todo con espacio"
      : attention.filter((row) => row.state === "full").length > 0
        ? "Hay cuentas llenas"
        : "Cuentas por llenarse";
  return (
    <InkIsland label="Lo próximo" className={ISLAND_SLOT}>
      <Kicker>Lo próximo</Kicker>
      <h2 className="font-heading text-[22px] leading-tight font-bold">{title}</h2>
      {diskAlert && disk?.capacity ? (
        <div className="grid grid-cols-[10px_minmax(0,1fr)] gap-2.5 border-t border-current/10 py-3">
          <span aria-hidden="true" className={cn("mt-1.5 size-2 rounded-full", disk.level === "critical" ? "bg-destructive" : "bg-warning")} />
          <div>
            <p className="text-sm font-semibold">Disco al {Math.round(100 - disk.capacity.usable_free_pct)} %</p>
            <p className="text-xs opacity-75">Quedan {formatBytes(disk.capacity.free_bytes)}. Amplía el VPS o depura media vieja.</p>
          </div>
        </div>
      ) : null}
      {attention.slice(0, 3).map((row) => (
        <div key={row.company_id} className="grid grid-cols-[10px_minmax(0,1fr)] gap-2.5 border-t border-current/10 py-3">
          <span aria-hidden="true" className={cn("mt-1.5 size-2 rounded-full", row.state === "full" ? "bg-destructive" : "bg-warning")} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {row.name} · {row.state === "full" ? `${formatBytes(row.used_bytes)} de ${formatBytes(row.quota_bytes)}` : `${Math.round(row.pct_used ?? 0)} %`}
            </p>
            <p className="text-xs opacity-75">
              {row.state === "full"
                ? "Su equipo no puede subir archivos."
                : row.growth_30d_bytes !== null && row.growth_30d_bytes > 0
                  ? `Crece ${formatBytes(row.growth_30d_bytes)} al mes.`
                  : "Pasa del 80 %."}
            </p>
          </div>
        </div>
      ))}
      {attention.length === 0 && !diskAlert ? (
        <p className="text-sm opacity-80">Ningún tenant pasa del 80 % y el disco está sano.</p>
      ) : null}
      {attention[0] !== undefined ? (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button asChild variant="contrast" size="sm" className="rounded-full">
            <Link href={`/platform/tenants/${attention[0].company_id}/storage`}>Ver {attention[0].name}</Link>
          </Button>
        </div>
      ) : null}
    </InkIsland>
  );
}

const SORTS = [
  { value: "pct_desc", label: "Más lleno" },
  { value: "growth_desc", label: "Crece más" },
  { value: "used_desc", label: "Ocupa más" },
] as const;

function TenantsTable() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<StorageTenantsParams["sort"]>("pct_desc");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ q: q || undefined, sort, page, page_size: 25 }), [q, sort, page]);
  const query = useStorageTenants(params);
  const rows: StorageTenantRow[] = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;

  return (
    <section className="@container min-w-0 overflow-hidden rounded-3xl border border-border bg-card" aria-label="Consumo por tenant">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <h2 className="font-sans text-[15px] font-semibold tracking-normal">Consumo por tenant</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SearchField value={q} onChange={(next) => { setQ(next); setPage(1); }} placeholder="Buscar tenant" label="Buscar tenant" className="w-full sm:w-60" />
          <SegmentedControl label="Orden" size="sm" surface="inline" value={sort} onValueChange={(next) => { setSort(next); setPage(1); }} items={SORTS} />
        </div>
      </div>
      {query.isError ? (
        <div className="p-5">
          <p className="text-sm text-muted-foreground">No pudimos cargar los tenants.</p>
          <Button variant="outline" size="sm" className="mt-2 rounded-full" onClick={() => void query.refetch()}>Reintentar</Button>
        </div>
      ) : (
        <div className="axi-scroll overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Tenant</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead className="text-right">Ocupa</TableHead>
                <TableHead className="hidden text-right @xl:table-cell">Últimos 30 días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const state = STATE_LABELS[row.state];
                return (
                  <TableRow
                    key={row.company_id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/platform/tenants/${row.company_id}/storage`)}
                  >
                    <TableCell className="max-w-[280px] pl-5">
                      <span className="block truncate font-medium">{row.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.quota_source === "override" ? "Ampliada" : row.plan_name === null ? "Sin plan" : `Plan ${row.plan_name}`}
                      </span>
                    </TableCell>
                    <TableCell className="w-36">
                      {row.quota_bytes === null ? (
                        <span className="text-xs text-muted-foreground">Sin cuota</span>
                      ) : (
                        <StorageMeter pct={row.pct_used} tone={meterTone(row.state)} label={`Uso de ${row.name}`} className="h-1.5" />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      <span className="font-medium">{formatBytes(row.used_bytes)}</span>
                      {row.quota_bytes === null ? null : <span className="text-muted-foreground"> de {formatBytes(row.quota_bytes)}</span>}
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums @xl:table-cell">
                      {row.growth_30d_bytes === null ? "—" : `${row.growth_30d_bytes >= 0 ? "+" : "−"}${formatBytes(Math.abs(row.growth_30d_bytes))}`}
                    </TableCell>
                    <TableCell>
                      <StatePill tone={state.tone}>{state.label}</StatePill>
                    </TableCell>
                    <TableCell>
                      <Link href={`/platform/tenants/${row.company_id}/storage`} aria-label={`Abrir ${row.name}`} onClick={(event) => event.stopPropagation()} className="grid size-8 place-items-center rounded-full hover:bg-muted">
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && !query.isPending ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    {q === "" ? "Aún no hay tenants con archivos." : `Ningún tenant coincide con «${q}».`}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
      {total > 25 ? (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
          <span>
            {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} de {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" className="rounded-full" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function StorageOverviewView() {
  const overview = useStorageOverview();
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Almacenamiento</h1>
        <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
          El disco del servidor y lo que ocupa cada tenant. Las cuotas y la depuración se manejan desde la ficha de cada uno.
        </p>
      </header>
      {overview.isPending ? (
        <div className={GRID}>
          <TileLoading className="md:col-span-2" />
          <TileLoading />
          <TileLoading className={ISLAND_SLOT} />
          <TileLoading className="md:col-span-2" />
          <TileLoading />
        </div>
      ) : overview.isError ? (
        <TileFailure label="Almacenamiento" onRetry={() => void overview.refetch()} />
      ) : (
        <div className={GRID}>
          <DiskTile provider={overview.data.providers.find((provider) => provider.kind === "physical") ?? overview.data.providers[0]} />
          <QuotasTile overview={overview.data} />
          <NextIsland overview={overview.data} />
          <OriginTile overview={overview.data} />
          <AttentionTile overview={overview.data} />
        </div>
      )}
      <TenantsTable />
    </div>
  );
}
