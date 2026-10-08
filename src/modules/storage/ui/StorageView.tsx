"use client";

import { useEffect, useState } from "react";
import { Activity, AlertCircle, HardDrive, Info, Lock, MessageCircle, RotateCw } from "lucide-react";
import { salesWhatsAppUrl } from "@/core/config/env";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoFigure, BentoTile, StatePill } from "@/shared/components/features/bento";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  ORIGIN_GROUP_COPY,
  STATE_PILL,
  STORAGE_READ_PERMISSION,
  driveModel,
  formatStorageBytes,
  freeBytes,
  groupByOrigin,
  hasQuota,
  headFigure,
  headLine,
  measuredAgo,
  pacePhrases,
  quotaProvenance,
  supportMessage,
  usedPct,
  windowPhrase,
  type Phrase,
  type StorageSummaryDTO,
} from "@/modules/storage/domain/storage";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";
import { DriveGlyph, FreeSwatch, OriginSwatch, PaceRoute, StorageMeter } from "./components/StorageGlyphs";

/**
 * Mi empresa › Almacenamiento (T1, mockup aprobado `view_tenant_self`). Bento
 * de fichas blancas: «Tu espacio» (lo que queda, el medidor y el glifo «Tu
 * disco»), «En qué se va» (tres orígenes), «Tu ritmo» (recorrido + proyección
 * al tope) y la salida «Hablar con soporte». Sin isla: no hay nada que decidir
 * aquí, solo leer y pedir más espacio.
 *
 * Solo owner/admin (`storage:read`): a quien no lo tiene se le explica quién
 * lo ve en vez de pedir un endpoint que le daría 403.
 */
export function StorageView() {
  const { hasPermission, status: authStatus } = useAuth();
  const canRead = hasPermission(STORAGE_READ_PERMISSION);
  const status = useStorageStore((store) => store.status);
  const summary = useStorageStore((store) => store.summary);
  const error = useStorageStore((store) => store.error);
  const load = useStorageStore((store) => store.load);
  const retry = useStorageStore((store) => store.retry);
  const refresh = useStorageStore((store) => store.refresh);

  useEffect(() => {
    if (!canRead) return;
    // Al entrar se relee: el vigía del layout pudo sembrarlo hace rato.
    if (useStorageStore.getState().summary === null) void load();
    else void refresh();
  }, [canRead, load, refresh]);

  if (authStatus === "authenticated" && !canRead) return <NoAccess />;
  if (summary === null) {
    if (status === "error") return <LoadError message={error} onRetry={retry} />;
    return <StorageSkeleton />;
  }
  return <StorageSummary summary={summary} />;
}

function StorageSummary({ summary }: { summary: StorageSummaryDTO }) {
  // La hora solo en el cliente: «Medido hace 4 min» se recalcula cada minuto.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const pill = STATE_PILL[summary.state];
  const figure = headFigure(summary);
  const pct = usedPct(summary);
  const provenance = quotaProvenance(summary);
  const totals = groupByOrigin(summary.by_category);
  const free = freeBytes(summary);
  const drive = driveModel(summary);
  const pace = pacePhrases(summary, now);
  const full = summary.state === "full";
  const unlimited = !hasQuota(summary);
  const support = salesWhatsAppUrl(supportMessage(summary.name));
  const side = pace !== null || unlimited;

  return (
    <div className="@container flex flex-col gap-4">
      {full ? (
        <Alert className="bg-muted rounded-[20px] [&>svg]:text-destructive">
          <HardDrive />
          <AlertDescription className="text-foreground flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
            <span className="text-pretty">
              <b className="font-medium">Tu equipo no puede subir archivos.</b> Fotos de catálogo, adjuntos y recursos esperan a que haya
              espacio.
            </span>
            <SupportButton href={support} className="self-start @xl:self-auto" />
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <BentoTile label="Tu espacio" aside={<StatePill tone={pill.tone}>{pill.label}</StatePill>} className="@2xl:col-span-2 @5xl:col-span-3">
          <div className="@container">
            <div className="grid items-center gap-7 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)]">
              <div className="flex min-w-0 flex-col gap-3">
                <BentoFigure value={figure.value} unit={figure.unit} />
                {pct !== null ? (
                  <>
                    <StorageMeter pct={pct} state={summary.state} />
                    <div className="text-muted-foreground flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11.5px] tabular-nums">
                      <span className="whitespace-nowrap">Usas {formatStorageBytes(summary.used_bytes)}</span>
                      {provenance ? <span>{provenance}</span> : null}
                    </div>
                  </>
                ) : null}
                <p className="text-muted-foreground text-[13px] leading-[1.45] text-pretty">
                  <PhraseText phrase={headLine(summary)} />
                </p>
                <ul className="text-muted-foreground mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs">
                  {totals.map((total) => (
                    <li key={total.group} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <OriginSwatch group={total.group} />
                      {ORIGIN_GROUP_COPY[total.group].short} {formatStorageBytes(total.bytes)}
                    </li>
                  ))}
                  {free !== null && free > 0 && !full ? (
                    <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <FreeSwatch />
                      Libre {formatStorageBytes(free)}
                    </li>
                  ) : null}
                </ul>
                <Provenance icon={<Activity className="size-3" />}>{measuredAgo(summary.measured_at, now)}</Provenance>
              </div>
              <DriveGlyph model={drive} state={summary.state} label={driveLabel(summary)} />
            </div>
          </div>
        </BentoTile>

        <BentoTile label="En qué se va" className={side ? "@2xl:col-span-2" : "@2xl:col-span-2 @5xl:col-span-3"}>
          <ul className="flex flex-col">
            {totals.map((total) => {
              const copy = ORIGIN_GROUP_COPY[total.group];
              return (
                <li
                  key={total.group}
                  className="border-border/60 grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 border-t py-2 text-[13px] first:border-t-0"
                >
                  <OriginSwatch group={total.group} />
                  <span className="min-w-0">
                    <b className="block font-medium">{copy.title}</b>
                    <small className="text-muted-foreground block text-xs">{copy.hint}</small>
                  </span>
                  <span className="text-right font-medium whitespace-nowrap tabular-nums">{formatStorageBytes(total.bytes)}</span>
                </li>
              );
            })}
          </ul>
          <Provenance icon={<Info className="size-3" />}>Los archivos los gestiona el equipo de Axi Connect.</Provenance>
        </BentoTile>

        {pace !== null ? (
          <BentoTile label="Tu ritmo" className="@2xl:col-span-2 @5xl:col-span-1">
            <p className="text-[15px] font-semibold text-pretty">{pace.title}</p>
            <PaceRoute summary={summary} />
            <p className="text-muted-foreground text-[13px] leading-[1.45] text-pretty">{pace.body}</p>
            <Provenance icon={<Activity className="size-3" />}>{windowPhrase(summary.growth.window_days)}</Provenance>
          </BentoTile>
        ) : unlimited ? (
          <BentoTile label="Qué sigue funcionando" className="@2xl:col-span-2 @5xl:col-span-1">
            <p className="text-muted-foreground text-[13px] leading-[1.45] text-pretty">
              Todo. Sin límite de espacio nada se pausa; solo te mostramos en qué se va.
            </p>
          </BentoTile>
        ) : null}

        {!full && !unlimited ? (
          <section className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-5 @2xl:col-span-2 @5xl:col-span-3">
            <div className="min-w-0">
              <p className="font-medium">¿Necesitas más espacio?</p>
              <p className="text-muted-foreground text-[13px] leading-[1.45] text-pretty">
                El equipo de Axi Connect amplía tu espacio o te ayuda a liberar el que tienes.
              </p>
            </div>
            <SupportButton href={support} />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function driveLabel(summary: StorageSummaryDTO): string {
  if (!hasQuota(summary)) return `Tu disco: ${formatStorageBytes(summary.used_bytes)} ocupados, sin tope`;
  return `Tu disco: ${formatStorageBytes(summary.used_bytes)} usados de ${formatStorageBytes(summary.quota_bytes)}`;
}

function PhraseText({ phrase }: { phrase: Phrase }) {
  return (
    <>
      {phrase.map((part, index) =>
        part.strong ? (
          <b key={index} className="text-foreground font-medium">
            {part.text}
          </b>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function Provenance({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs [&>svg]:shrink-0">
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      {children}
    </span>
  );
}

/** «Hablar con soporte»: el WhatsApp de Axi con el pedido ya escrito (axi vende por el canal que predica). */
function SupportButton({ href, className }: { href: string; className?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className={cn("rounded-full", className)}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden="true" />
        Hablar con soporte
      </a>
    </Button>
  );
}

/** Silueta por ficha: el mismo bento, sin cifras. */
export function StorageSkeleton() {
  return (
    <div className="@container" role="status" aria-busy="true" aria-label="Cargando tu espacio">
      <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <BentoTile label="Tu espacio" className="@2xl:col-span-2 @5xl:col-span-3">
          <div className="@container">
            <div className="grid items-center gap-7 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)]">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-2/3 rounded-xl" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-4/5 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
              <Skeleton className="h-52 w-full rounded-[26px]" />
            </div>
          </div>
        </BentoTile>
        <BentoTile label="En qué se va" className="@2xl:col-span-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-9 w-full rounded-lg" />
          ))}
        </BentoTile>
        <BentoTile label="Tu ritmo" className="@2xl:col-span-2 @5xl:col-span-1">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </BentoTile>
      </div>
    </div>
  );
}

/** Error al leer: dice qué pasó y deja reintentar. Un error nunca se pinta como un cero. */
function LoadError({ message, onRetry }: { message: string | null; onRetry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <BentoTile label="Tu espacio">
      <div className="flex flex-col items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
            <AlertCircle className="size-4" />
          </span>
          <p className="text-sm font-semibold text-pretty">No pudimos leer tu espacio</p>
        </div>
        {message ? <p className="text-muted-foreground text-xs text-pretty">{message}</p> : null}
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            void onRetry().finally(() => setRetrying(false));
          }}
        >
          <RotateCw aria-hidden="true" className={cn(retrying && "animate-spin")} />
          Reintentar
        </Button>
      </div>
    </BentoTile>
  );
}

/** Sin `storage:read`: se dice quién lo ve, en vez de una pantalla vacía. */
function NoAccess() {
  return (
    <BentoTile label="Almacenamiento">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Lock className="size-4" />
        </span>
        <p className="text-muted-foreground text-sm text-pretty">
          El espacio de la empresa lo ven quienes la administran. Pídeles que lo revisen si una subida no entra.
        </p>
      </div>
    </BentoTile>
  );
}
