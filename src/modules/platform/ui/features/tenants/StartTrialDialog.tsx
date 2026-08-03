"use client";

/**
 * Iniciar/extender la prueba gratuita de un tenant. Semántica del backend
 * (POST /platform/tenants/:id/trial): asignar, extender (suma desde el
 * vencimiento vigente) y reactivar un trial vencido comparten el endpoint.
 * Callout del contrato: el costo de IA corre por cuenta de axi, pero aplican
 * los topes del plan `trial` — reasignarlo re-siembra esos límites.
 */
import { useState } from "react";
import { Info, LoaderCircle } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import type { TenantListItem } from "../../../domain/tenant";
import { useStartTrial } from "../../../infrastructure/api/hooks/use-tenants";

const MIN_DAYS = 1;
const MAX_DAYS = 90;
const DEFAULT_DAYS = 7;

type StartTrialDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantListItem;
};

export function StartTrialDialog({ open, onOpenChange, tenant }: StartTrialDialogProps) {
  const { showAlert } = useAlert();
  const startTrial = useStartTrial();
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const extending = tenant.status === "trial" && tenant.trial_ends_at !== null;
  const validDays = Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS;

  async function submit() {
    if (!validDays) return;
    setSubmitError(null);
    try {
      const result = await startTrial.mutateAsync({ id: tenant.id, body: { days } });
      showAlert({
        tone: "success",
        title: extending ? "Prueba extendida" : "Prueba iniciada",
        description: `${tenant.name} tiene acceso hasta el ${new Date(
          result.trial_ends_at,
        ).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.`,
        autoCloseMs: 6000,
      });
      onOpenChange(false);
    } catch (error) {
      // 409 platform/trial_not_allowed: suspensión manual o tenant enterprise
      if (isHttpError(error) && error.is("platform/trial_not_allowed")) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!startTrial.isPending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {extending ? `Extender la prueba de «${tenant.name}»` : `Iniciar prueba para «${tenant.name}»`}
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
            El costo de IA corre por cuenta de axi durante la prueba; aplican los topes del plan
            trial. {extending ? "Los días se suman al vencimiento vigente." : "Al vencer, el acceso se suspende automáticamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="trial-days">Días de prueba</Label>
          <Input
            id="trial-days"
            type="number"
            min={MIN_DAYS}
            max={MAX_DAYS}
            value={days}
            onChange={(event) => setDays(event.target.valueAsNumber)}
          />
          {!validDays && (
            <p className="text-sm text-destructive">Entre {MIN_DAYS} y {MAX_DAYS} días.</p>
          )}
        </div>

        {submitError != null && (
          <p role="alert" className="text-sm text-destructive">
            {typeof submitError === "string" ? submitError : errorMessage(submitError)}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={startTrial.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={startTrial.isPending || !validDays}>
            {startTrial.isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {startTrial.isPending ? "Aplicando…" : extending ? "Extender prueba" : "Iniciar prueba"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
