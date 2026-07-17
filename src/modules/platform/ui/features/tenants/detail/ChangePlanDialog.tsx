"use client";

/**
 * Cambiar el plan del tenant. Callout del contrato: reasignar RE-SIEMBRA los
 * límites del plan (los `manual` se conservan). Enterprise aquí SÍ es
 * elegible; si la DB dedicada no está activa, el backend responde 409
 * `tenant_db/not_active` → alert con CTA al tab Base de datos (spec §7).
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, LoaderCircle, OctagonAlert } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { usePlansQuery } from "../../../../infrastructure/api/hooks/use-plans";
import { useAssignTenantPlan } from "../../../../infrastructure/api/hooks/use-tenant-plan";
import { PlanOptionCard } from "../../plans/PlanOptionCard";

type ChangePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  /** Plan vigente (para preseleccionar). */
  currentPlanId: string | null;
};

export function ChangePlanDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  currentPlanId,
}: ChangePlanDialogProps) {
  const { showAlert } = useAlert();
  const plansQuery = usePlansQuery();
  const assignPlan = useAssignTenantPlan(tenantId);
  const [selected, setSelected] = useState<string | null>(currentPlanId);
  const [dbBlocked, setDbBlocked] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const plans = (plansQuery.data?.data ?? []).filter((plan) => plan.is_active);

  async function submit() {
    if (!selected || selected === currentPlanId) return;
    setDbBlocked(false);
    setSubmitError(null);
    try {
      await assignPlan.mutateAsync(selected);
      showAlert({
        tone: "success",
        title: "Plan asignado",
        description: "Los límites del plan se re-sembraron; los manuales se conservan.",
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      if (isHttpError(error) && error.is("tenant_db/not_active")) {
        setDbBlocked(true);
        return;
      }
      if (isHttpError(error) && (error.is("usage/plan_not_found") || error.is("usage/plan_inactive"))) {
        showAlert({ tone: "error", title: "El plan no está disponible", description: errorMessage(error) });
        void plansQuery.refetch();
        return;
      }
      setSubmitError(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!assignPlan.isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cambiar plan de «{tenantName}»</DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
            Reasignar re-siembra los límites del plan; los manuales se conservan.
          </DialogDescription>
        </DialogHeader>

        {plansQuery.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : (
          <div role="radiogroup" aria-label="Plan a asignar" className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanOptionCard
                key={plan.id}
                plan={plan}
                checked={selected === plan.id}
                onSelect={() => { setSelected(plan.id); setDbBlocked(false); }}
              />
            ))}
          </div>
        )}

        {dbBlocked && (
          <Alert variant="destructive" className="border-destructive/30">
            <OctagonAlert aria-hidden="true" className="size-4" />
            <AlertTitle>Enterprise requiere una base dedicada activa</AlertTitle>
            <AlertDescription>
              <p>Configura y provisiona la base de datos del tenant antes de asignar este plan.</p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href={`/platform/tenants/${tenantId}/database`}>
                  Configurar base de datos
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {submitError != null && (
          <p role="alert" className="text-sm text-destructive">{errorMessage(submitError)}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={assignPlan.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={assignPlan.isPending || !selected || selected === currentPlanId}
          >
            {assignPlan.isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {assignPlan.isPending ? "Asignando…" : "Asignar plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
