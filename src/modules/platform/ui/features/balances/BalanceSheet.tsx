"use client";

/**
 * Detalle de un proveedor en Dinero › Saldos (mockup aprobado): desde cuándo
 * falla y qué dejó de funcionar, el saldo con su cálculo, el gasto por
 * proyecto, registrar una recarga (OpenAI no deja leer su saldo prepago) y
 * cuándo avisar.
 */
import { useState } from "react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  balanceStateKey,
  dateInputToIso,
  endSentence,
  formatDay,
  formatRunway,
  formatUsd,
  formatWhen,
  isoToDateInput,
  parseAmount,
  type ProviderBalance,
} from "../../../domain/balances";
import { useResolveIncident, useUpdateBalance } from "../../../infrastructure/api/hooks/use-balances";
import { PlatformStatePill } from "../../components/PlatformStatePill";

function Figure({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "danger";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 rounded-2xl border p-3",
        tone === "danger" ? "border-destructive/30 bg-destructive/5" : "border-border",
      )}
    >
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "truncate font-mono text-base font-semibold tabular-nums",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </span>
      {note ? <span className="truncate text-[11px] text-muted-foreground">{note}</span> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function IncidentNotice({ provider }: { provider: ProviderBalance }) {
  const { showAlert } = useAlert();
  const resolve = useResolveIncident();
  const incident = provider.incident;
  if (!incident) return null;
  const what = incident.kind === "no_funds" ? "Sin saldo" : "Llave inválida";

  async function markResolved() {
    if (!incident) return;
    try {
      await resolve.mutateAsync(incident.id);
      showAlert({ tone: "success", title: `${provider.name}: incidente cerrado`, autoCloseMs: 4000 });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo cerrar el incidente", description: errorMessage(error) });
    }
  }

  return (
    <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-destructive/10 p-4 text-sm">
      <p className="font-semibold text-foreground">
        {what} desde las {formatWhen(incident.since)}
      </p>
      <p className="text-foreground/80 text-pretty">
        {incident.failure_count} {incident.failure_count === 1 ? "petición rechazada" : "peticiones rechazadas"} ·{" "}
        {endSentence(`la última a las ${formatWhen(incident.last_seen_at)}`)} Mientras siga así, {provider.impact}.
      </p>
      <p className="text-xs text-muted-foreground">
        {incident.notified_at ? `Correo enviado ${formatWhen(incident.notified_at)}` : "El correo aún no sale"}
        {incident.next_reminder_at ? ` · próximo recordatorio ${formatWhen(incident.next_reminder_at)}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        Se cierra solo cuando {provider.name} vuelva a responder bien.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-1 self-start rounded-full"
        disabled={resolve.isPending}
        onClick={() => void markResolved()}
      >
        {resolve.isPending ? "Cerrando…" : "Marcar como resuelto"}
      </Button>
    </div>
  );
}

function BalanceFigures({ provider }: { provider: ProviderBalance }) {
  if (!provider.measurable) {
    return (
      <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground text-pretty">
        {provider.name} no deja consultar su saldo. Lo vigilamos por sus respuestas: si dice «sin saldo», «llave
        inválida» o deja de responder, pasa a rojo y te llega un correo.
      </p>
    );
  }
  const danger = provider.level === "critical";
  if (provider.probe === "openai_admin") {
    if (provider.loaded_amount_usd === null || provider.balance_usd === null) {
      return (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground text-pretty">
          OpenAI no deja leer el saldo prepago. Registra abajo tu última recarga y Axi resta el gasto real de toda la
          organización desde ese día.
        </p>
      );
    }
    const spent = provider.loaded_amount_usd - provider.balance_usd;
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
        <Figure
          label="Última recarga"
          value={formatUsd(provider.loaded_amount_usd)}
          note={provider.loaded_at ? formatDay(provider.loaded_at) : undefined}
        />
        <Figure label="Gastado desde ahí" value={formatUsd(spent)} note="gasto real" />
        <Figure
          label="Queda"
          value={formatUsd(provider.balance_usd)}
          note={formatRunway(provider.runway_days)}
          tone={danger ? "danger" : undefined}
        />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
      <Figure
        label="Saldo exacto"
        value={provider.balance_usd === null ? "—" : formatUsd(provider.balance_usd)}
        note="según el proveedor"
        tone={danger ? "danger" : undefined}
      />
      <Figure label="Alcanza para" value={formatRunway(provider.runway_days)} note="al gasto de 7 días" />
    </div>
  );
}

function Breakdown({ provider }: { provider: ProviderBalance }) {
  const lines = provider.spend_breakdown;
  if (lines.length === 0) return null;
  const max = Math.max(...lines.map((line) => line.usd), 0.0001);
  return (
    <Section title="Gasto de los últimos 7 días por proyecto">
      <ul className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <li key={line.label} className="flex flex-col gap-1.5">
            <span className="flex justify-between gap-3 text-xs">
              <span className="truncate">{line.label}</span>
              <span className="font-mono tabular-nums">{formatUsd(line.usd)}</span>
            </span>
            <span aria-hidden="true" className="h-2 rounded-full bg-muted">
              <span
                className={cn("block h-2 rounded-full", index === 0 ? "bg-primary" : "bg-accent-violet")}
                style={{ width: `${String(Math.max(2, (line.usd / max) * 100))}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function RechargeForm({ provider }: { provider: ProviderBalance }) {
  const { showAlert } = useAlert();
  const update = useUpdateBalance(provider.id);
  const [amount, setAmount] = useState(
    provider.loaded_amount_usd === null ? "" : String(provider.loaded_amount_usd).replace(".", ","),
  );
  const [day, setDay] = useState(isoToDateInput(provider.loaded_at) || isoToDateInput(new Date().toISOString()));
  const parsed = parseAmount(amount);
  const iso = dateInputToIso(day);
  const valid = typeof parsed === "number" && parsed > 0 && iso !== null;

  async function save() {
    if (!valid || typeof parsed !== "number" || iso === null) return;
    try {
      await update.mutateAsync({ loaded_amount_usd: parsed, loaded_at: iso });
      showAlert({ tone: "success", title: "Recarga guardada", description: "El saldo se recalculó con el gasto real.", autoCloseMs: 5000 });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar la recarga", description: errorMessage(error) });
    }
  }

  return (
    <Section title="Registrar una recarga">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recharge-amount">Monto (US$)</Label>
          <Input
            id="recharge-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={parsed === undefined || undefined}
            className="tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recharge-date">Fecha</Label>
          <Input id="recharge-date" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
        </div>
      </div>
      {parsed === undefined ? <p className="text-xs text-destructive">Escribe el monto con números.</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="rounded-full" disabled={!valid || update.isPending} onClick={() => void save()}>
          {update.isPending ? "Guardando…" : "Guardar recarga"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Consejo: activa la recarga automática en platform.openai.com › Billing.
        </span>
      </div>
    </Section>
  );
}

const THRESHOLD_FIELDS = [
  { key: "warn_days", label: "Aviso: alcanza para (días)", tone: "warning" },
  { key: "warn_usd", label: "o quedan menos de (US$)", tone: "warning" },
  { key: "critical_days", label: "Crítico: alcanza para (días)", tone: "danger" },
  { key: "critical_usd", label: "o quedan menos de (US$)", tone: "danger" },
] as const;

type ThresholdKey = (typeof THRESHOLD_FIELDS)[number]["key"];

function ThresholdsForm({ provider }: { provider: ProviderBalance }) {
  const { showAlert } = useAlert();
  const update = useUpdateBalance(provider.id);
  const [values, setValues] = useState<Record<ThresholdKey, string>>({
    warn_days: String(provider.thresholds.warn_days),
    warn_usd: String(provider.thresholds.warn_usd).replace(".", ","),
    critical_days: String(provider.thresholds.critical_days),
    critical_usd: String(provider.thresholds.critical_usd).replace(".", ","),
  });
  const parsed = Object.fromEntries(
    THRESHOLD_FIELDS.map(({ key }) => [key, parseAmount(values[key])]),
  ) as Record<ThresholdKey, number | null | undefined>;
  const complete = THRESHOLD_FIELDS.every(({ key }) => typeof parsed[key] === "number");
  const days = complete && (parsed.critical_days as number) <= (parsed.warn_days as number);
  const usd = complete && (parsed.critical_usd as number) <= (parsed.warn_usd as number);
  const changed = THRESHOLD_FIELDS.some(({ key }) => parsed[key] !== provider.thresholds[key]);
  const problem = !complete
    ? "Escribe los cuatro umbrales con números."
    : !days || !usd
      ? "El crítico no puede ser más alto que el aviso."
      : null;

  async function save() {
    if (problem !== null) return;
    try {
      await update.mutateAsync({
        thresholds: {
          warn_days: Math.round(parsed.warn_days as number),
          warn_usd: parsed.warn_usd as number,
          critical_days: Math.round(parsed.critical_days as number),
          critical_usd: parsed.critical_usd as number,
        },
      });
      showAlert({ tone: "success", title: "Umbrales guardados", autoCloseMs: 4000 });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudieron guardar los umbrales", description: errorMessage(error) });
    }
  }

  return (
    <Section title="Cuándo avisar">
      <div className="grid grid-cols-2 gap-2">
        {THRESHOLD_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`threshold-${field.key}`} className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden="true"
                className={cn("size-1.5 shrink-0 rounded-full", field.tone === "danger" ? "bg-destructive" : "bg-warning")}
              />
              {field.label}
            </Label>
            <Input
              id={`threshold-${field.key}`}
              inputMode="decimal"
              value={values[field.key]}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              aria-invalid={parsed[field.key] === undefined || undefined}
              className="tabular-nums"
            />
          </div>
        ))}
      </div>
      {problem && changed ? <p className="text-xs text-destructive">{problem}</p> : null}
      <Button
        type="button"
        variant="outline"
        className="self-start rounded-full"
        disabled={!changed || problem !== null || update.isPending}
        onClick={() => void save()}
      >
        {update.isPending ? "Guardando…" : "Guardar umbrales"}
      </Button>
    </Section>
  );
}

export function BalanceSheet({
  provider,
  open,
  onOpenChange,
}: {
  provider: ProviderBalance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      heroTitle
      title={provider.name}
      subtitle={provider.use}
      headerExtra={<PlatformStatePill status={balanceStateKey(provider)} />}
    >
      <div className="flex flex-col gap-5 p-5">
        <IncidentNotice provider={provider} />
        <Section title="Saldo">
          <BalanceFigures provider={provider} />
          {provider.check_error ? (
            <p className="text-xs text-destructive">No se pudo leer el saldo: {provider.check_error}</p>
          ) : null}
          {provider.probe === "openai_admin" && provider.measurable ? (
            <p className="text-xs text-muted-foreground text-pretty">
              El gasto sale de OpenAI con la llave de administración (solo lectura): incluye todo lo que gasta la
              organización, también desarrollo.
            </p>
          ) : null}
        </Section>
        <Breakdown provider={provider} />
        {provider.probe === "openai_admin" && provider.measurable ? <RechargeForm provider={provider} /> : null}
        {provider.measurable ? <ThresholdsForm provider={provider} /> : null}
      </div>
    </DetailSheet>
  );
}
