"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, TriangleAlert } from "lucide-react";

import { formatShortDate } from "@/core/lib/format";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  localToday,
  manualRateExpired,
  MAX_SPREAD_BPS,
  percentToSpread,
  spreadToPercent,
  type FxSettingsDTO,
} from "@/modules/payments/domain/fx-settings";

const SETTLEMENT_CURRENCIES = [
  { code: "COP", label: "COP · Peso colombiano" },
  { code: "USD", label: "USD · Dólar" },
  { code: "MXN", label: "MXN · Peso mexicano" },
];

/** Paso del ajuste: medio punto, como se negocia una comisión de cambio. */
const SPREAD_STEP = 0.5;

function Row({ title, hint, control }: { title: string; hint: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/60 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 max-w-[56ch] text-[13px] leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** Lo que el agente dirá con el borrador actual, para la isla de la pestaña. */
export interface FxDraft {
  currency: string;
  indicative: boolean;
}

/**
 * Ajustes de `settings.fx`: con qué tasa cotiza el tenant. El catálogo sigue
 * en su moneda; esto decide el equivalente que ve el cliente y la tasa que se
 * congela al confirmar el pedido.
 *
 * El formulario es local y se guarda entero (`PUT /fx/settings`): son cuatro
 * campos acoplados entre sí (una manual vigente anula el ajuste) y guardarlos
 * por separado dejaría estados intermedios que no significan nada.
 */
export function FxSettingsForm({
  settings,
  saving,
  onSave,
  onDraftChange,
  today = localToday(),
}: {
  settings: FxSettingsDTO;
  saving: boolean;
  onSave: (next: FxSettingsDTO) => void;
  /** El borrador en vivo: la isla «Así cotiza el agente» lo refleja antes de guardar. */
  onDraftChange?: (draft: FxDraft) => void;
  /** YYYY-MM-DD local; inyectable en tests. */
  today?: string;
}) {
  const [currency, setCurrency] = useState(settings.settlement_currency);
  const [spread, setSpread] = useState(spreadToPercent(settings.spread_bps));
  const [manualOn, setManualOn] = useState(settings.manual_rate !== null);
  const [manualRate, setManualRate] = useState(settings.manual_rate === null ? "" : String(settings.manual_rate.rate));
  const [manualUntil, setManualUntil] = useState(settings.manual_rate?.valid_until ?? "");
  const [indicative, setIndicative] = useState(settings.show_indicative_quotes);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDraftChange?.({ currency, indicative });
  }, [currency, indicative, onDraftChange]);

  // La manual guardada venció y sigue tal cual en el formulario: el servidor ya
  // cotiza con la oficial, y la pantalla tiene que decirlo (QA real, F2).
  const expiredNotice =
    manualOn &&
    manualRateExpired(settings, today) &&
    manualUntil === settings.manual_rate?.valid_until
      ? settings.manual_rate.valid_until
      : null;

  const stepSpread = (direction: 1 | -1) => {
    const current = percentToSpread(spread);
    const base = current === null ? settings.spread_bps : current;
    const next = Math.min(MAX_SPREAD_BPS, Math.max(0, base + direction * SPREAD_STEP * 100));
    setSpread(spreadToPercent(next));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const bps = percentToSpread(spread);
    if (bps === null) {
      setError(`El ajuste debe ser un número entre 0 y ${String(MAX_SPREAD_BPS / 100)} %.`);
      return;
    }
    let manual: FxSettingsDTO["manual_rate"] = null;
    if (manualOn) {
      const rate = Number(manualRate.replace(",", "."));
      if (!Number.isFinite(rate) || rate <= 0) {
        setError("Escribe la tasa manual como un número mayor que cero.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(manualUntil)) {
        setError("La tasa manual necesita una fecha de vigencia.");
        return;
      }
      manual = { rate, valid_until: manualUntil };
    }
    setError(null);
    onSave({
      settlement_currency: currency,
      spread_bps: bps,
      manual_rate: manual,
      show_indicative_quotes: indicative,
    });
  };

  return (
    <form
      className="flex min-w-0 flex-col rounded-3xl border border-border bg-card px-5 pt-2 pb-5 md:px-6"
      onSubmit={submit}
      aria-labelledby="fx-settings-title"
    >
      <h2 id="fx-settings-title" className="sr-only">
        Ajustes de moneda
      </h2>

      <Row
        title="Ajuste sobre la TRM"
        hint={`Cubre la comisión de cambio. Se suma a la oficial; hasta ${spreadToPercent(MAX_SPREAD_BPS)} %.`}
        control={
          <div className="flex items-center gap-1 rounded-full bg-muted p-1" role="group" aria-label="Ajuste sobre la TRM">
            <Button type="button" variant="ghost" size="icon" className="rounded-full bg-card" aria-label="Bajar medio punto" onClick={() => stepSpread(-1)}>
              <Minus aria-hidden="true" />
            </Button>
            <Label htmlFor="fx-spread" className="sr-only">
              Ajuste sobre la TRM (%)
            </Label>
            <Input
              id="fx-spread"
              inputMode="decimal"
              className="h-9 w-20 border-0 bg-transparent text-center font-semibold tabular-nums shadow-none"
              value={spread}
              onChange={(event) => setSpread(event.target.value)}
            />
            <Button type="button" variant="ghost" size="icon" className="rounded-full bg-card" aria-label="Subir medio punto" onClick={() => stepSpread(1)}>
              <Plus aria-hidden="true" />
            </Button>
          </div>
        }
      />

      <Row
        title="Usar una tasa manual"
        hint="Cuando la oficial no te sirve (fuente caída, acuerdo especial). Vence sola."
        control={<Switch checked={manualOn} onCheckedChange={setManualOn} aria-label="Usar una tasa manual" />}
      />
      {manualOn ? (
        <div className="grid gap-4 pb-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fx-manual-rate">Tasa manual</Label>
            <Input
              id="fx-manual-rate"
              inputMode="decimal"
              className="tabular-nums"
              placeholder="3150,00"
              value={manualRate}
              onChange={(event) => setManualRate(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fx-manual-until">Vigente hasta</Label>
            <Input
              id="fx-manual-until"
              type="date"
              value={manualUntil}
              aria-invalid={expiredNotice !== null}
              onChange={(event) => setManualUntil(event.target.value)}
            />
          </div>
          {expiredNotice !== null ? (
            // §9.4: un estado que dura es Alert en línea; el ámbar va al icono, no al texto.
            <Alert variant="warning" role="status" className="sm:col-span-2">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>
                <span>
                  Tu tasa manual venció el {formatShortDate(expiredNotice)}: hoy se cotiza con la oficial y el ajuste.
                  Ponle una fecha nueva o apágala.
                </span>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <Row
        title="Mostrar el precio en pesos al cotizar"
        hint="El agente muestra el equivalente en pesos a la tasa del día junto al precio. Indicativo hasta confirmar."
        control={
          <Switch checked={indicative} onCheckedChange={setIndicative} aria-label="Mostrar el precio en pesos al cotizar" />
        }
      />

      <Row
        title="Moneda en la que cobras"
        hint="Se fija al confirmar el pedido: el total queda en esta moneda a la tasa de ese momento."
        control={
          <>
            <Label htmlFor="fx-settlement" className="sr-only">
              Moneda en la que cobras
            </Label>
            <select
              id="fx-settlement"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {SETTLEMENT_CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        }
      />

      {error ? <p className="pt-1 text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end border-t border-border/60 pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
