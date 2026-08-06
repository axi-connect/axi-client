"use client";

/**
 * Tab Plan & Límites del tenant: plan vigente (o "Sin plan"), límites
 * efectivos con su ORIGEN (▓ plan violeta / ◆ manual ámbar — spec §5.3) y
 * edición del set con el `LimitsEditor` compartido en un `DetailSheet`.
 * PUT limits REEMPLAZA el set completo (aviso explícito).
 */
import { useState } from "react";
import { Layers, PencilLine, TriangleAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { formatShortDate } from "@/core/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  actionLabel,
  metricInfo,
  periodLabel,
  validateLimits,
  type LimitInput,
  type LimitIssue,
} from "../../../../domain/limits";
import { useTenantQuery } from "../../../../infrastructure/api/hooks/use-tenants";
import {
  useReplaceTenantLimits,
  useTenantPlanQuery,
} from "../../../../infrastructure/api/hooks/use-tenant-plan";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { StatusBadge } from "../../../components/StatusBadge";
import { LimitsEditor } from "../../limits/LimitsEditor";
import { limitValueLabel } from "../../limits/limit-format";
import { ChangePlanDialog } from "./ChangePlanDialog";

function SourceBadge({ source }: { source: "plan" | "manual" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        source === "plan"
          ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
          : "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
      )}
    >
      {source}
    </Badge>
  );
}

export function TenantPlanView({ tenantId }: { tenantId: string }) {
  const { showAlert } = useAlert();
  const { data, isPending, isError, error, refetch } = useTenantPlanQuery(tenantId);
  const { data: tenant } = useTenantQuery(tenantId);
  const replaceLimits = useReplaceTenantLimits(tenantId);

  const [changeOpen, setChangeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<LimitInput[]>([]);
  const [draftIssues, setDraftIssues] = useState<LimitIssue[]>([]);
  const [serverError, setServerError] = useState<unknown>(null);

  if (isPending) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando plan del tenant">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} />;

  const { plan, subscription_status, billing_cycle_anchor, limits } = data;

  function openEditor() {
    // El editor trabaja sobre el WIRE shape (sin id/source): el PUT reemplaza el set.
    setDraft(
      limits.map(({ metric, period, limit_value, is_cost_limit, action, grace_pct, enabled }) => ({
        metric, period, limit_value, is_cost_limit, action, grace_pct, enabled,
      })),
    );
    setDraftIssues([]);
    setServerError(null);
    setEditOpen(true);
  }

  async function saveLimits() {
    const issues = validateLimits(draft);
    setDraftIssues(issues);
    if (issues.length > 0) return;
    setServerError(null);
    try {
      await replaceLimits.mutateAsync({ limits: draft });
      showAlert({
        tone: "success",
        title: "Límites actualizados",
        description: "El set completo del tenant fue reemplazado.",
        autoCloseMs: 5000,
      });
      setEditOpen(false);
    } catch (error) {
      // usage/limit_invalid (u otro): el editor queda abierto con el detail.
      setServerError(error);
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
        {plan ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-semibold">{plan.name}</span>
            <Badge
              variant="outline"
              className={cn(
                plan.tier === "enterprise"
                  ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
                  : "border-border text-muted-foreground",
              )}
            >
              {plan.tier}
            </Badge>
            {subscription_status && <StatusBadge status={subscription_status} />}
            {billing_cycle_anchor && (
              <span className="text-sm text-muted-foreground">
                Ancla: {formatShortDate(billing_cycle_anchor)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers aria-hidden="true" className="size-4" />
            Sin plan asignado — los límites vigentes son manuales.
          </div>
        )}
        <Button variant={plan ? "outline" : "default"} onClick={() => setChangeOpen(true)}>
          {plan ? "Cambiar plan" : "Asignar plan"}
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-background">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            Límites efectivos <span className="text-muted-foreground tabular-nums">({limits.length})</span>
          </h2>
          <Button size="sm" variant="outline" onClick={openEditor}>
            <PencilLine aria-hidden="true" />
            Editar límites
          </Button>
        </header>

        {limits.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Sin límites: el consumo del tenant no se controla. Asigna un plan o añade límites manuales.
          </p>
        ) : (
          /* Mismo aire que la tabla de pricing (mockup F3): el p-2 del
             primitivo se queda corto en tablas full-bleed dentro de card */
          <Table className="[&_th]:h-11 [&_th]:px-4 [&_td]:px-4 [&_td]:py-3">
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Origen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limits.map((limit) => (
                <TableRow key={limit.id} className={cn(!limit.enabled && "opacity-50")}>
                  <TableCell className="font-medium">
                    {metricInfo(limit.metric).label}
                    {!limit.enabled && <span className="ml-1.5 text-xs text-muted-foreground">(inactivo)</span>}
                    {limit.is_cost_limit && (
                      <Badge variant="outline" className="ml-1.5 border-border text-[10px] uppercase text-muted-foreground">
                        cost cap
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{periodLabel(limit.period)}</TableCell>
                  <TableCell className="text-right tabular-nums">{limitValueLabel(limit)}</TableCell>
                  <TableCell className="text-muted-foreground">{actionLabel(limit.action)}</TableCell>
                  <TableCell><SourceBadge source={limit.source} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <ChangePlanDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        tenantId={tenantId}
        tenantName={tenant?.name ?? "este tenant"}
        currentPlanId={plan?.id ?? null}
      />

      <DetailSheet
        open={editOpen}
        onOpenChange={(open) => { if (!replaceLimits.isPending) setEditOpen(open); }}
        title="Editar límites del tenant"
        subtitle={tenant?.name}
        size="xl"
      >
        <div className="space-y-4 p-4">
          <Alert className="border-warning/30 bg-warning/5">
            <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
            <AlertTitle>Se reemplaza el set completo</AlertTitle>
            <AlertDescription>
              Lo que guardes aquí sustituye TODOS los límites vigentes (incluidos los sembrados por el plan).
            </AlertDescription>
          </Alert>

          <LimitsEditor
            value={draft}
            onChange={(next) => { setDraft(next); setDraftIssues([]); }}
            issues={draftIssues}
            disabled={replaceLimits.isPending}
          />

          {serverError != null && <ProblemAlert error={serverError} />}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={replaceLimits.isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveLimits()} disabled={replaceLimits.isPending}>
              {replaceLimits.isPending ? "Guardando…" : "Reemplazar límites"}
            </Button>
          </div>
        </div>
      </DetailSheet>
    </div>
  );
}
