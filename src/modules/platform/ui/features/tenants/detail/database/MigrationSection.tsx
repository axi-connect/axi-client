"use client";

/**
 * Migración de datos SBS → Enterprise (spec §5.4):
 * - Precondiciones ✔/✘ con remedio (cada ✘ enlaza su solución).
 * - "Migrar datos…" con `ConfirmTyped` REFORZADO: ventana de mantenimiento,
 *   el tenant queda suspendido durante el cutover.
 * - En vuelo: StepIndicator de fases + copiados por modelo (poll 5 s) +
 *   nota "puedes salir de esta vista".
 * - `failed`/`rolled_back`: panel rojo con `error` + stats origen/destino
 *   (diferencias resaltadas). Sin reintento automático (runbook).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleX,
  Info,
  OctagonAlert,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  isMigrationRunning,
  MIGRATION_STEPS,
  migrationPreconditions,
  migrationStep,
  parseMigrationProgress,
  parseMigrationStats,
  type DataMigration,
  type TenantDatabaseView,
} from "../../../../../domain/database";
import { useTenantPlanQuery } from "../../../../../infrastructure/api/hooks/use-tenant-plan";
import {
  latestMigration,
  useMigrationsQuery,
  useStartDataMigration,
} from "../../../../../infrastructure/api/hooks/use-tenant-migrations";
import { ConfirmTyped } from "../../../../components/ConfirmTyped";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { StatusBadge } from "../../../../components/StatusBadge";
import { StepIndicator } from "@/shared/components/ui/step-indicator";

function MigrationProgress({ migration }: { migration: DataMigration }) {
  const rows = useMemo(() => parseMigrationProgress(migration.progress), [migration.progress]);
  const step = migrationStep(migration.status);

  return (
    <div className="space-y-4">
      {step !== null && (
        <StepIndicator steps={MIGRATION_STEPS} current={step} ariaLabel="Fase de la migración" />
      )}
      {rows.length > 0 && (
        <dl className="space-y-1">
          {rows.map((row) => (
            <div key={row.model} className="flex items-center justify-between gap-3 text-sm">
              <dt className="font-mono text-xs">{row.model}</dt>
              <dd className="tabular-nums text-muted-foreground">
                {row.copied.toLocaleString("es-CO")} filas
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info aria-hidden="true" className="size-3.5" />
        Puedes salir de esta vista; el proceso continúa en el servidor.
      </p>
    </div>
  );
}

function MigrationStats({ migration }: { migration: DataMigration }) {
  const rows = useMemo(() => parseMigrationStats(migration.stats), [migration.stats]);
  if (rows.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Modelo</TableHead>
          <TableHead className="text-right">Origen</TableHead>
          <TableHead className="text-right">Destino</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const mismatch = row.source !== null && row.target !== null && row.source !== row.target;
          return (
            <TableRow key={row.model} className={cn(mismatch && "text-destructive")}>
              <TableCell className="font-mono text-xs">{row.model}</TableCell>
              <TableCell className="text-right tabular-nums">{row.source?.toLocaleString("es-CO") ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{row.target?.toLocaleString("es-CO") ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

type MigrationSectionProps = {
  tenantId: string;
  tenantName: string;
  database: TenantDatabaseView;
};

export function MigrationSection({ tenantId, tenantName, database }: MigrationSectionProps) {
  const { showAlert } = useAlert();
  const planQuery = useTenantPlanQuery(tenantId);
  const migrationsQuery = useMigrationsQuery(tenantId);
  const startMigration = useStartDataMigration(tenantId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const migrations = migrationsQuery.data?.data ?? [];
  const latest = latestMigration(migrations);
  const running = latest !== null && isMigrationRunning(latest.status);

  const preconditions = migrationPreconditions({
    db: database,
    planTier: planQuery.data?.plan?.tier ?? null,
    migrationRunning: running,
  });
  const ready = preconditions.every((item) => item.ok);

  async function start() {
    try {
      await startMigration.mutateAsync();
      setConfirmOpen(false);
      showAlert({
        tone: "info",
        title: "Migración iniciada",
        description: "El progreso se actualiza cada 5 segundos. El cutover suspenderá el tenant.",
        autoCloseMs: 6000,
      });
    } catch (error) {
      setConfirmOpen(false);
      showAlert({ tone: "error", title: "No se pudo iniciar la migración", description: errorMessage(error) });
    }
  }

  if (planQuery.isPending || migrationsQuery.isPending) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Migración de datos (SBS → Enterprise)</h3>
        {latest && running && <StatusBadge status={latest.status} />}
      </header>

      {running && latest ? (
        <MigrationProgress migration={latest} />
      ) : (
        <>
          <ul className="space-y-2" aria-label="Precondiciones de la migración">
            {preconditions.map((item) => (
              <li key={item.key} className="flex flex-wrap items-center gap-2 text-sm">
                {item.ok ? (
                  <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                ) : (
                  <CircleX aria-hidden="true" className="size-4 shrink-0 text-destructive" />
                )}
                <span className={item.ok ? undefined : "font-medium"}>{item.label}</span>
                {!item.ok && item.remedy && <span className="text-muted-foreground">— {item.remedy}</span>}
                {!item.ok && item.key === "plan_sbs" && planQuery.data?.plan?.tier !== "enterprise" && (
                  <Button asChild size="sm" variant="ghost" className="h-6 px-2">
                    <Link href={`/platform/tenants/${tenantId}/plan`}>
                      Ver plan
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <Button onClick={() => setConfirmOpen(true)} disabled={!ready || startMigration.isPending}>
            Migrar datos…
          </Button>
        </>
      )}

      {latest && (latest.status === "failed" || latest.status === "rolled_back") && (
        <Alert variant="destructive" className="border-destructive/30">
          <OctagonAlert aria-hidden="true" className="size-4" />
          <AlertTitle>
            {latest.status === "failed" ? "Migración fallida" : "Migración revertida"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            {latest.error && <p className="font-mono text-xs">{latest.error}</p>}
            <MigrationStats migration={latest} />
            <p className="text-xs">
              Sin reintento automático: la decisión es manual (ver runbook de operación).
            </p>
          </AlertDescription>
        </Alert>
      )}

      {migrations.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 transition-transform", historyOpen && "rotate-180")}
            />
            Historial ({migrations.length})
          </button>
          {historyOpen && (
            <ul className="space-y-1.5">
              {migrations.map((migration) => (
                <li key={migration.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <RelativeDate iso={migration.created_at} className="text-muted-foreground" />
                  <StatusBadge status={migration.status} />
                  {migration.error && (
                    <span className="truncate font-mono text-xs text-muted-foreground">{migration.error}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmTyped
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Migrar datos de «${tenantName}»`}
        description={
          <>
            <p>
              Esto inicia una <strong className="text-foreground">ventana de mantenimiento</strong>:
              durante el cutover el tenant quedará <strong className="text-foreground">suspendido</strong> y
              sus usuarios sin acceso.
            </p>
            <p>Acuerda la ventana con el cliente ANTES de continuar.</p>
          </>
        }
        confirmText={tenantName}
        actionLabel="Migrar datos"
        pending={startMigration.isPending}
        onConfirm={() => void start()}
      />
    </section>
  );
}
