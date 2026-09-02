"use client";

import { useState } from "react";
import { Activity, KeyRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
  callAccountStatus,
  CALL_ACCOUNT_STATUS_LABELS,
  type CallAccount,
  type CallAccountStatus,
} from "../../../domain/call-provisioning";
import {
  useProbeCallAccount,
  useUpdateCallAccount,
} from "../../../infrastructure/api/hooks/use-call-provisioning";
import { RotateTwilioCredentialsSheet } from "./TwilioCredentialsSheets";

const STATUS_CLASSES: Record<CallAccountStatus, string> = {
  active: "border-success/40 bg-success/10 text-success",
  disabled: "border-border bg-muted text-muted-foreground",
  unhealthy: "border-destructive/40 bg-destructive/10 text-destructive",
  no_credential: "border-warning/40 bg-warning/10 text-warning",
  capped_day: "border-warning/40 bg-warning/10 text-warning",
  capped_month: "border-warning/40 bg-warning/10 text-warning",
};

/** La cuenta madre de Twilio (calco de ProviderCard de prospecting). */
export function CallAccountCard({ account }: { account: CallAccount }) {
  const status = callAccountStatus(account);
  const update = useUpdateCallAccount();
  const probe = useProbeCallAccount();
  const [rotating, setRotating] = useState(false);

  return (
    <article className="border-border shadow-float bg-background rounded-lg border p-4">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-bold">Twilio · {account.label}</h3>
          <p className="text-muted-foreground text-xs">
            Con esta cuenta se compran los números y salen las llamadas de todos los tenants.
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[status]}`}
        >
          {CALL_ACCOUNT_STATUS_LABELS[status]}
        </span>
        <Switch
          checked={account.enabled}
          // Sin llave el interruptor mentiría; apagada = gasto vetado a propósito
          disabled={status === "no_credential" || update.isPending}
          onCheckedChange={(enabled) => update.mutate({ id: account.id, enabled })}
          aria-label={`Encender ${account.label}`}
        />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        <Field
          label="Llave"
          value={account.token_last4 === null ? "sin llave" : `···${account.token_last4}`}
        />
        <Field
          label="Gasto hoy (s)"
          value={
            account.daily_cap === null
              ? String(account.spent_today)
              : `${String(account.spent_today)} / ${String(account.daily_cap)}`
          }
        />
        <Field
          label="Gasto del mes (s)"
          value={
            account.monthly_cap === null
              ? String(account.spent_cycle)
              : `${String(account.spent_cycle)} / ${String(account.monthly_cap)}`
          }
        />
        <Field
          label="Última sonda"
          value={
            account.last_checked_at === null
              ? "nunca"
              : new Date(account.last_checked_at).toLocaleString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
          }
        />
      </dl>

      {account.last_error !== null && (
        <p className="text-destructive bg-destructive/8 border-destructive/25 mt-3 rounded-md border px-2 py-1.5 text-xs">
          {account.last_error}
        </p>
      )}

      <footer className="mt-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={probe.isPending}
          onClick={() => probe.mutate(account.id)}
        >
          <Activity className="size-4" aria-hidden />
          Probar
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRotating(true)}>
          <KeyRound className="size-4" aria-hidden />
          Cambiar llave
        </Button>
        {probe.data !== undefined && (
          <span className="text-muted-foreground text-xs">
            Sonda:{" "}
            <strong className={probe.data.healthy ? "text-success" : "text-destructive"}>
              {probe.data.healthy ? "cuenta viva" : (probe.data.detail ?? "falló")}
            </strong>
          </span>
        )}
      </footer>

      {rotating && (
        <RotateTwilioCredentialsSheet account={account} onClose={() => setRotating(false)} />
      )}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10.5px] tracking-wide uppercase">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
