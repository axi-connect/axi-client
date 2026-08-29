"use client";

import { useState } from "react";
import { Activity, KeyRound } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";

import {
  CAPABILITY_LABELS,
  PROVIDER_DESCRIPTORS,
  PROVIDER_STATUS_LABELS,
  providerStatus,
  type ProviderAccount,
  type ProviderStatus,
} from "@/modules/platform/domain/prospecting-providers";
import {
  useProbeProvider,
  useUpdateProvider,
} from "@/modules/platform/infrastructure/api/hooks/use-prospecting-providers";
import { RotateCredentialsSheet } from "./ConnectProviderSheet";

const STATUS_CLASSES: Record<ProviderStatus, string> = {
  active: "border-success/40 bg-success/10 text-success",
  disabled: "border-border bg-muted text-muted-foreground",
  unhealthy: "border-destructive/40 bg-destructive/10 text-destructive",
  // Sin llave es un problema distinto de «con problemas»: no es que falle, es
  // que no hay con qué llamar.
  no_credential: "border-warning/40 bg-warning/10 text-warning",
  capped_day: "border-warning/40 bg-warning/10 text-warning",
  capped_month: "border-warning/40 bg-warning/10 text-warning",
};

export function ProviderCard({ account }: { account: ProviderAccount }) {
  const descriptor = PROVIDER_DESCRIPTORS[account.provider];
  const status = providerStatus(account);
  const update = useUpdateProvider();
  const probe = useProbeProvider();
  const [rotating, setRotating] = useState(false);

  return (
    <article className="border-border shadow-float bg-background rounded-lg border p-4">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-bold">
              {descriptor.label}
            </h3>
            <span className="text-muted-foreground text-xs">
              {account.label}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[status]}`}
            >
              {PROVIDER_STATUS_LABELS[status]}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {descriptor.tagline}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {account.enabled ? "Encendido" : "Apagado"}
          </span>
          <Switch
            checked={account.enabled}
            // Sin llave no se puede encender: el interruptor mentiría.
            disabled={status === "no_credential" || update.isPending}
            onCheckedChange={(enabled) =>
              update.mutate({ id: account.id, enabled })
            }
            aria-label={`Encender ${descriptor.label}`}
          />
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        <Field label="Orden en la cascada" value={String(account.priority)} />
        <Field
          label="Llave"
          value={
            account.token_last4 === null
              ? "sin llave"
              : `···${account.token_last4}`
          }
        />
        <Field
          label="Gasto hoy"
          value={
            account.daily_cap === null
              ? String(account.spent_today)
              : `${String(account.spent_today)} / ${String(account.daily_cap)}`
          }
        />
        <Field
          label="Gasto del mes"
          value={
            account.monthly_cap === null
              ? String(account.spent_cycle)
              : `${String(account.spent_cycle)} / ${String(account.monthly_cap)}`
          }
        />
      </dl>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {account.capabilities.map((capability) => (
          <span
            key={capability}
            className="border-border bg-secondary text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]"
          >
            {CAPABILITY_LABELS[capability] ?? capability}
          </span>
        ))}
      </div>

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
        {probe.data?.balance !== undefined && (
          <span className="text-muted-foreground text-xs">
            Saldo:{" "}
            <strong className="text-foreground">{probe.data.balance}</strong>
          </span>
        )}
      </footer>

      {rotating && (
        <RotateCredentialsSheet
          account={account}
          onClose={() => setRotating(false)}
        />
      )}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10.5px] tracking-wide uppercase">
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
