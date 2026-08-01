"use client";

/**
 * Tab Base de datos: orquesta la máquina de estados de la DB dedicada.
 * - `null` (404) → EmptyState "sin configurar" + form inicial.
 * - Configurada → StepIndicator del camino feliz + metadatos + acciones
 *   (editar / validar síncrono / provisionar con poll / deshabilitar).
 * - `error` → panel rojo con `last_error` + reintentar provisión.
 * - Poll degradado (>10 min) → aviso "sigue en curso".
 */
import { useState } from "react";
import { Database, Info, LoaderCircle, OctagonAlert } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  checklistPasses,
  dbStatusStep,
  DB_STATUS_STEPS,
} from "../../../../../domain/database";
import {
  useDisableDatabase,
  useProvisionDatabase,
  useTenantDatabaseQuery,
  useValidateDatabase,
} from "../../../../../infrastructure/api/hooks/use-tenant-database";
import { useTenantQuery } from "../../../../../infrastructure/api/hooks/use-tenants";
import { EmptyState } from "../../../../components/EmptyState";
import { ProblemAlert } from "../../../../components/ProblemAlert";
import { StatusBadge } from "../../../../components/StatusBadge";
import { StepIndicator } from "../../../../components/StepIndicator";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { DatabaseConnectionSheet } from "./DatabaseConnectionSheet";
import { ValidationChecklist } from "./ValidationChecklist";
import { MigrationSection } from "./MigrationSection";

export function TenantDatabaseView({ tenantId }: { tenantId: string }) {
  const { showAlert } = useAlert();
  const { data: database, isPending, isError, error, refetch, pollDegraded } =
    useTenantDatabaseQuery(tenantId);
  const { data: tenant } = useTenantQuery(tenantId);
  const validate = useValidateDatabase(tenantId);
  const provision = useProvisionDatabase(tenantId);
  const disable = useDisableDatabase(tenantId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const tenantName = tenant?.name ?? "este tenant";

  if (isPending) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando base de datos">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} />;

  async function runValidate() {
    try {
      const result = await validate.mutateAsync();
      showAlert({
        tone: checklistPasses(result) ? "success" : "warning",
        title: checklistPasses(result) ? "Validación exitosa" : "La validación encontró problemas",
        description: checklistPasses(result)
          ? "La base cumple todos los requisitos: ya puedes provisionar."
          : "Revisa el checklist: cada ✘ trae su remedio.",
        autoCloseMs: 5000,
      });
    } catch (error) {
      if (isHttpError(error) && error.is("tenant_db/provision_in_progress")) {
        showAlert({ tone: "warning", title: "Provisión en curso", description: "Espera a que termine para validar." });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo validar", description: errorMessage(error) });
    }
  }

  async function runProvision() {
    try {
      await provision.mutateAsync();
      showAlert({
        tone: "info",
        title: "Provisión iniciada",
        description: "El estado se actualiza automáticamente cada 3 segundos.",
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo iniciar la provisión", description: errorMessage(error) });
    }
  }

  async function runDisable() {
    try {
      await disable.mutateAsync();
      setDisableOpen(false);
      showAlert({ tone: "success", title: "Base deshabilitada", autoCloseMs: 5000 });
    } catch (error) {
      setDisableOpen(false);
      if (isHttpError(error) && error.is("tenant_db/in_use")) {
        showAlert({
          tone: "error",
          title: "El plan enterprise usa esta base",
          description: "Cambia el plan del tenant primero (tab Plan & Límites).",
        });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo deshabilitar", description: errorMessage(error) });
    }
  }

  const step = database ? dbStatusStep(database.status) : null;
  const lastValidation = validate.data ?? null;
  const canProvision = lastValidation !== null && checklistPasses(lastValidation);
  const busy = database?.status === "validating" || database?.status === "migrating";

  return (
    <div className="space-y-4">
      {database === null ? (
        <EmptyState
          icon={Database}
          title="Sin base de datos dedicada"
          description="Este tenant opera en la base compartida (SBS). Configura una conexión para habilitar el plan Enterprise."
          action={<Button onClick={() => setSheetOpen(true)}>Configurar conexión</Button>}
        />
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Base de datos dedicada</h2>
              <StatusBadge status={database.status} />
            </header>

            {step !== null && (
              <StepIndicator steps={DB_STATUS_STEPS} current={step} ariaLabel="Estado de la provisión" />
            )}

            <p className="text-sm text-muted-foreground">
              host <span className="font-mono text-foreground">{database.host}:{database.port}</span>
              {" · "}db <span className="font-mono text-foreground">{database.database_name}</span>
              {" · "}ssl <span className="font-mono text-foreground">{database.ssl_mode}</span>
              {" · "}usuario <span className="font-mono text-foreground">{database.username}</span>
              {" · "}pool <span className="tabular-nums text-foreground">{database.pool_max}</span>
              {database.migration_version && (
                <>
                  {" · "}schema <span className="font-mono text-foreground">{database.migration_version}</span>
                </>
              )}
              {database.last_validated_at && (
                <>
                  {" · "}validada <RelativeDate iso={database.last_validated_at} className="text-foreground" />
                </>
              )}
            </p>

            {database.status === "error" && database.last_error && (
              <Alert variant="destructive" className="border-destructive/30">
                <OctagonAlert aria-hidden="true" className="size-4" />
                <AlertTitle>La provisión falló</AlertTitle>
                <AlertDescription>
                  <p className="font-mono text-xs">{database.last_error}</p>
                </AlertDescription>
              </Alert>
            )}

            {busy && pollDegraded && (
              <Alert className="border-info/30 bg-info/5">
                <Info aria-hidden="true" className="size-4 text-info" />
                <AlertTitle>Sigue en curso</AlertTitle>
                <AlertDescription>
                  El proceso lleva más de 10 minutos; el estado se re-consulta cada 15 segundos.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setSheetOpen(true)} disabled={busy}>
                Editar conexión
              </Button>
              <Button variant="outline" onClick={() => void runValidate()} disabled={busy || validate.isPending}>
                {validate.isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
                {validate.isPending ? "Validando…" : "Validar"}
              </Button>
              <Button
                onClick={() => void runProvision()}
                disabled={busy || provision.isPending || (database.status !== "error" && !canProvision)}
                title={canProvision || database.status === "error" ? undefined : "Valida la conexión primero: se habilita con el checklist en verde."}
              >
                {provision.isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
                {database.status === "error" ? "Reintentar provisión" : "Provisionar"}
              </Button>
              {database.status !== "disabled" && (
                <Button variant="ghost" onClick={() => setDisableOpen(true)} disabled={busy}>
                  Deshabilitar
                </Button>
              )}
            </div>
          </section>

          {lastValidation && (
            <section className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold">Última validación</h3>
              <ValidationChecklist result={lastValidation} />
            </section>
          )}

          <MigrationSection tenantId={tenantId} tenantName={tenantName} database={database} />
        </>
      )}

      <DatabaseConnectionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tenantId={tenantId}
        tenantName={tenantName}
        database={database ?? null}
        key={database ? database.updated_at : "create"}
      />

      <Modal
        open={disableOpen}
        onOpenChange={setDisableOpen}
        config={{
          title: "Deshabilitar la base dedicada",
          description:
            "El tenant volverá a operar en la base compartida. La configuración se conserva y puedes reprovisionarla después.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            { label: disable.isPending ? "Deshabilitando…" : "Deshabilitar", onClick: () => void runDisable() },
          ],
        }}
      />
    </div>
  );
}
