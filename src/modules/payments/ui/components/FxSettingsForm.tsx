"use client";

import { useState } from "react";
import { Lock, MessageCircle, Tag, TriangleAlert } from "lucide-react";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  FX_SAMPLE_CENTS,
  localToday,
  manualRateExpired,
  MAX_SPREAD_BPS,
  percentToSpread,
  sampleQuoteCents,
  spreadToPercent,
  type FxSettingsDTO,
  type LatestFxRateDTO,
} from "@/modules/payments/domain/fx-settings";

const SETTLEMENT_CURRENCIES = [
  { code: "COP", label: "COP · Peso colombiano" },
  { code: "USD", label: "USD · Dólar" },
  { code: "MXN", label: "MXN · Peso mexicano" },
];

function Row({ title, hint, control }: { title: string; hint: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border/50 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 max-w-[56ch] text-xs text-muted-foreground">{hint}</p>
      </div>
      {control}
    </div>
  );
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
  latest,
  saving,
  onSave,
  today = localToday(),
}: {
  settings: FxSettingsDTO;
  /** La tasa que manda HOY: de ella sale el ejemplo, para no contradecir a la tarjeta. */
  latest: LatestFxRateDTO;
  saving: boolean;
  onSave: (next: FxSettingsDTO) => void;
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

  // La manual guardada venció y sigue tal cual en el formulario: el servidor ya
  // cotiza con la oficial, y la pantalla tiene que decirlo (QA real, F2).
  const expiredNotice =
    manualOn &&
    manualRateExpired(settings, today) &&
    manualUntil === settings.manual_rate?.valid_until
      ? settings.manual_rate.valid_until
      : null;
  const sampleCents = sampleQuoteCents(latest);

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
    <form className="rounded-2xl border border-border bg-card p-5 md:p-6" onSubmit={submit} aria-labelledby="fx-settings-title">
      <div className="mb-4">
        <h2 id="fx-settings-title" className="text-lg font-medium">
          Ajustes de moneda
        </h2>
        <p className="mt-0.5 max-w-[70ch] text-sm text-muted-foreground">
          Tu catálogo está en su moneda; aquí decides en cuál cobras y con qué tasa cotizas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fx-settlement">Moneda en la que cobras</Label>
          <select
            id="fx-settlement"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {SETTLEMENT_CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Se fija al confirmar el pedido: el total queda en esta moneda a la tasa de ese momento.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fx-spread">Ajuste sobre la TRM (%)</Label>
          <Input
            id="fx-spread"
            inputMode="decimal"
            className="tabular-nums"
            value={spread}
            onChange={(event) => setSpread(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Hasta {spreadToPercent(MAX_SPREAD_BPS)} %. Cubre la comisión de cambio; se suma a la oficial.
          </p>
        </div>
      </div>

      <div className="mt-2">
        <Row
          title="Usar una tasa manual"
          hint="Cuando la oficial no te sirve (fuente caída, acuerdo especial). Vence sola."
          control={<Switch checked={manualOn} onCheckedChange={setManualOn} aria-label="Usar una tasa manual" />}
        />
        {manualOn ? (
          <div className="grid gap-4 py-2 sm:grid-cols-2">
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
              <p role="status" className="flex items-start gap-2 text-xs text-warning sm:col-span-2">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Tu tasa manual venció el {formatShortDate(expiredNotice)}: hoy se cotiza con la oficial y el
                  ajuste. Ponle una fecha nueva o apágala.
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
        <Row
          title="Mostrar el precio en pesos al cotizar"
          hint={
            sampleCents === null
              ? "El agente muestra el equivalente en pesos a la tasa del día junto al precio. Indicativo hasta confirmar."
              : `El agente dice «≈ ${formatMoney(sampleCents, "COP")} a la tasa de hoy» junto al precio de ${formatMoney(FX_SAMPLE_CENTS, "USD")}. Indicativo hasta confirmar.`
          }
          control={
            <Switch
              checked={indicative}
              onCheckedChange={setIndicative}
              aria-label="Mostrar el precio en pesos al cotizar"
            />
          }
        />
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-3">
        {[
          { icon: Tag, title: "Catálogo en su moneda.", text: "Los precios de tus salidas no cambian." },
          { icon: MessageCircle, title: "Cotización indicativa.", text: "El agente muestra el equivalente a la tasa del día." },
          { icon: Lock, title: "Se congela al confirmar.", text: "El total del pedido queda con la tasa de ese momento." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="grid grid-cols-[20px_1fr] gap-2.5 rounded-xl border border-border bg-secondary p-3 text-sm">
            <Icon aria-hidden="true" className="mt-0.5 size-[18px] text-muted-foreground" />
            <p>
              <strong className="font-medium">{title}</strong> {text}
            </p>
          </div>
        ))}
      </div>
    </form>
  );
}
