"use client";

/**
 * Tenant › Almacenamiento (lienzo P2): uso contra cuota, en qué se va,
 * crecimiento, la isla con lo próximo, depurar (solo platform, D5), la
 * retención automática y el historial.
 */
import { useRef, useState } from "react";
import { Activity, Eraser, FileSpreadsheet, Files, MessageSquare, Pencil, Phone, Trash } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { BentoFigure, BentoTile, InkIsland, Kicker, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import {
  byOrigin,
  bytesFigure,
  categoryLabel,
  CATEGORY_LABELS,
  formatBytes,
  humanDays,
  meterTone,
  PURGE_KINDS,
  quotaSourceLabel,
  STATE_LABELS,
  type PurgeKind,
  type PurgeOption,
  type TenantStorage,
} from "../../../domain/storage";
import { usePurgeOptions, useTenantStorage } from "../../../infrastructure/api/hooks/use-storage";
import { usePlatformRole } from "../../../infrastructure/auth/use-platform-role";
import {
  LegendRow,
  ORIGIN_SWATCH,
  OriginBar,
  Provenance,
  Sparkline,
  StorageMeter,
  TileFailure,
  TileLoading,
} from "./parts";
import { PurgePanel } from "./PurgePanel";
import { PurgeRunsCard } from "./PurgeRunsCard";
import { QuotaSheet } from "./QuotaSheet";
import { RetentionCard } from "./RetentionCard";

type PanelKind = Exclude<PurgeKind, "offboarding">;

const KIND_ICONS: Record<PanelKind, React.ComponentType<{ className?: string }>> = {
  conversation_media: MessageSquare,
  trash: Trash,
  large_files: Files,
  call_recordings: Phone,
  imports: FileSpreadsheet,
};

function UsageTile({
  storage,
  onQuota,
  onPurge,
  canEdit,
}: {
  storage: TenantStorage;
  onQuota: () => void;
  onPurge: () => void;
  canEdit: boolean;
}) {
  const state = STATE_LABELS[storage.state];
  const unlimited = storage.quota_bytes === null;
  const figure = unlimited ? bytesFigure(storage.used_bytes) : bytesFigure(storage.used_bytes);
  return (
    <BentoTile
      label={`Espacio de ${storage.name}`}
      className="md:col-span-2"
      aside={<StatePill tone={state.tone}>{state.label}</StatePill>}
    >
      <BentoFigure
        value={figure.value}
        unit={unlimited ? `${figure.unit} ocupados` : `${figure.unit} de ${formatBytes(storage.quota_bytes)}`}
      />
      {unlimited ? null : (
        <>
          <StorageMeter pct={storage.pct_used} tone={meterTone(storage.state)} label="Uso de la cuota" />
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>{quotaSourceLabel(storage.quota_source, storage.plan_name)}</span>
            {storage.grace_pct > 0 ? <span>Margen +{storage.grace_pct} %</span> : null}
          </div>
        </>
      )}
      <p className="text-sm text-pretty text-muted-foreground">
        {storage.state === "full" ? (
          <>
            Las subidas de su equipo están en pausa.{" "}
            <span className="font-medium text-foreground">Los mensajes de sus clientes siguen llegando completos</span>{" "}
            y cuentan en el espacio.
          </>
        ) : unlimited ? (
          "Su plan no fija cuota: nada se pausa por espacio."
        ) : (
          <>
            Le quedan{" "}
            <span className="font-medium text-foreground">
              {formatBytes(Math.max(0, (storage.quota_bytes ?? 0) - storage.used_bytes))}
            </span>
            {storage.growth.days_to_full !== null ? ` · a su ritmo, ${humanDays(storage.growth.days_to_full)}` : ""}.
          </>
        )}
      </p>
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onQuota}>
            <Pencil className="size-4" aria-hidden="true" />
            Cambiar cuota
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onPurge}>
            <Eraser className="size-4" aria-hidden="true" />
            Depurar
          </Button>
        </div>
      ) : null}
    </BentoTile>
  );
}

function GrowthTile({ storage }: { storage: TenantStorage }) {
  const perMonth = storage.growth.per_month_bytes;
  const points = storage.growth.series.map((row) => row.bytes);
  return (
    <BentoTile label="Crecimiento">
      {perMonth === null ? (
        <p className="text-sm text-pretty text-muted-foreground">
          Estamos aprendiendo su ritmo: con unos días de fotos diarias habrá tendencia.
        </p>
      ) : (
        <>
          <BentoFigure
            size="md"
            value={`${perMonth >= 0 ? "+" : "−"}${bytesFigure(Math.abs(perMonth)).value}`}
            unit={`${bytesFigure(Math.abs(perMonth)).unit} al mes`}
          />
          <Sparkline points={points} />
        </>
      )}
      <Provenance icon={Activity}>Según los últimos {Math.round(storage.growth.window_days / 30)} meses</Provenance>
    </BentoTile>
  );
}

function BreakdownTile({ storage }: { storage: TenantStorage }) {
  const origins = byOrigin(storage.by_category);
  const rows = storage.by_category.filter((row) => row.origin !== "platform");
  return (
    <BentoTile
      label="En qué se va"
      className="md:col-span-2"
      aside={<span className="text-xs text-muted-foreground">Clientes · Equipo · Sistema</span>}
    >
      <OriginBar parts={origins} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay archivos. Se mide desde el primer mensaje con foto.</p>
      ) : (
        <div>
          {rows.map((row) => (
            <LegendRow
              key={row.category}
              swatch={
                ORIGIN_SWATCH[(CATEGORY_LABELS[row.category]?.origin ?? row.origin) as "customer" | "team" | "system"]
              }
              title={categoryLabel(row.category)}
              hint={`${new Intl.NumberFormat("es-CO").format(row.objects)} ${row.objects === 1 ? "archivo" : "archivos"}`}
              value={formatBytes(row.bytes)}
            />
          ))}
        </div>
      )}
    </BentoTile>
  );
}

function NextIsland({
  storage,
  options,
  onPreview,
  onQuota,
  canEdit,
}: {
  storage: TenantStorage;
  options: PurgeOption[] | undefined;
  onPreview: (kind: PanelKind) => void;
  onQuota: () => void;
  canEdit: boolean;
}) {
  const media = options?.find((option) => option.kind === "conversation_media");
  const trash = options?.find((option) => option.kind === "trash");
  const urgent = storage.state === "full" || storage.state === "warning";
  return (
    <InkIsland label="Lo próximo">
      <Kicker>Lo próximo</Kicker>
      <h2 className="font-heading text-[22px] leading-tight font-bold">
        {urgent ? "Liberar espacio o ampliar" : "Todo en orden"}
      </h2>
      {media !== undefined && media.up_to_bytes > 0 ? (
        <div className="grid grid-cols-[10px_minmax(0,1fr)] gap-2.5 border-t border-current/10 py-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1.5 size-2 rounded-full",
              storage.state === "full" ? "bg-destructive" : urgent ? "bg-warning" : "bg-muted-foreground",
            )}
          />
          <div>
            <p className="text-sm font-semibold">Hasta {formatBytes(media.up_to_bytes)} en media de chats</p>
            <p className="text-xs opacity-75">La vista previa dice cuánto de eso es viejo y qué se conserva.</p>
          </div>
        </div>
      ) : null}
      {trash !== undefined && trash.up_to_bytes > 0 ? (
        <div className="grid grid-cols-[10px_minmax(0,1fr)] gap-2.5 border-t border-current/10 py-3">
          <span aria-hidden="true" className="mt-1.5 size-2 rounded-full bg-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">{formatBytes(trash.up_to_bytes)} en la papelera</p>
            <p className="text-xs opacity-75">Fotos y recursos que el equipo ya borró.</p>
          </div>
        </div>
      ) : null}
      {storage.quota_bytes !== null && storage.growth.per_month_bytes !== null && storage.growth.per_month_bytes > 0 ? (
        <div className="grid grid-cols-[10px_minmax(0,1fr)] gap-2.5 border-t border-current/10 py-3">
          <span aria-hidden="true" className="mt-1.5 size-2 rounded-full bg-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">O ampliar la cuota</p>
            <p className="text-xs opacity-75">Crece {formatBytes(storage.growth.per_month_bytes)} al mes.</p>
          </div>
        </div>
      ) : null}
      {canEdit ? (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="contrast"
            size="sm"
            className="rounded-full"
            onClick={() => onPreview("conversation_media")}
          >
            Ver vista previa
          </Button>
          <Button type="button" variant="glass" size="sm" onClick={onQuota}>
            Ampliar cuota
          </Button>
        </div>
      ) : null}
    </InkIsland>
  );
}

function PurgeCards({
  options,
  active,
  onPick,
}: {
  options: PurgeOption[] | undefined;
  active: PanelKind | null;
  onPick: (kind: PanelKind) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {PURGE_KINDS.map((item) => {
        const option = options?.find((row) => row.kind === item.kind);
        const Icon = KIND_ICONS[item.kind];
        return (
          <button
            key={item.kind}
            type="button"
            aria-pressed={active === item.kind}
            onClick={() => onPick(item.kind)}
            className={cn(
              "grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-[20px] border border-border bg-card p-4 text-left transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active === item.kind && "border-foreground shadow-[0_0_0_1px_var(--foreground)]",
            )}
          >
            <span className="row-span-2 grid size-10 place-items-center rounded-xl bg-muted">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium">{item.title}</span>
            <span className="text-[12.5px] leading-snug text-muted-foreground">{item.description}</span>
            <span className="col-start-2 mt-1.5 text-[12.5px] tabular-nums">
              {option === undefined ? (
                <span className="text-muted-foreground">…</span>
              ) : item.kind === "large_files" ? (
                <>
                  Los más pesados de{" "}
                  <span className="font-medium">{new Intl.NumberFormat("es-CO").format(option.files)}</span>
                </>
              ) : option.up_to_bytes === 0 ? (
                <span className="text-muted-foreground">Nada que liberar</span>
              ) : (
                <>
                  Recuperable: <span className="font-medium">hasta {formatBytes(option.up_to_bytes)}</span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TenantStorageView({ tenantId }: { tenantId: string }) {
  const storage = useTenantStorage(tenantId);
  const options = usePurgeOptions(tenantId);
  const role = usePlatformRole();
  // Ampliar y depurar: super admin y soporte (billing_ops solo mira)
  const canEdit = role !== "billing_ops";
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const purgeRef = useRef<HTMLDivElement>(null);
  const openPanel = (kind: PanelKind) => {
    setPanel(kind);
    requestAnimationFrame(() => purgeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (storage.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TileLoading className="md:col-span-2" />
        <TileLoading />
        <TileLoading className="md:col-span-2" />
        <TileLoading />
      </div>
    );
  }
  if (storage.isError) return <TileFailure label="Almacenamiento" onRetry={() => void storage.refetch()} />;
  const data = storage.data;
  const recoverable =
    options.data === undefined
      ? null
      : options.data
          .filter(
            (option) =>
              option.kind === "conversation_media" || option.kind === "call_recordings" || option.kind === "imports",
          )
          .reduce((sum, option) => sum + option.up_to_bytes, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UsageTile
          storage={data}
          canEdit={canEdit}
          onQuota={() => setQuotaOpen(true)}
          onPurge={() => openPanel("conversation_media")}
        />
        <GrowthTile storage={data} />
        <BreakdownTile storage={data} />
        <NextIsland
          storage={data}
          options={options.data}
          canEdit={canEdit}
          onPreview={openPanel}
          onQuota={() => setQuotaOpen(true)}
        />
      </div>

      {canEdit ? (
        <section ref={purgeRef} aria-labelledby="purge-title" className="flex scroll-mt-4 flex-col gap-3">
          <div>
            <h2 id="purge-title" className="font-sans text-[17px] font-semibold tracking-tight">
              Depurar
            </h2>
            <p className="text-sm text-muted-foreground">
              Lo que se borra aquí se borra ya. Antes verás cuánto liberas y qué se conserva.
            </p>
          </div>
          <PurgeCards options={options.data} active={panel} onPick={openPanel} />
          {panel !== null ? (
            <PurgePanel key={panel} kind={panel} storage={data} onClose={() => setPanel(null)} />
          ) : null}
        </section>
      ) : null}

      <RetentionCard tenantId={tenantId} recoverableBytes={recoverable} />
      <PurgeRunsCard tenantId={tenantId} />

      {quotaOpen ? <QuotaSheet open={quotaOpen} onOpenChange={setQuotaOpen} storage={data} /> : null}
    </div>
  );
}
