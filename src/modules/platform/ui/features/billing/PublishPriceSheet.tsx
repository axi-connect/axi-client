"use client";

/**
 * Publicar una tarifa nueva. **No es un formulario de edición**: no hay PATCH
 * del importe y no hay que pedirlo — publicar cierra la vigencia anterior y crea
 * una fila nueva, para que una factura ya emitida conserve el precio con el que
 * se vendió.
 *
 * El error a vigilar es `billing/price_vigency_overlap` (409): la vigencia pisa a
 * otra. Se traduce a un mensaje que dice qué hacer, no el código.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  OVERAGE_METRICS,
  OVERAGE_METRIC_LABELS,
  type OverageMetric,
} from "../../../domain/billing";
import { usePublishPrice } from "../../../infrastructure/api/hooks/use-billing";

/** Fila del editor de excedentes, con los importes como texto hasta el submit. */
type RateDraft = {
  metric: OverageMetric;
  unit_size: string;
  amount: string;
  /** Vacío = tomar el tope del plan del tenant (`included_quantity: null`). */
  included: string;
};

const EMPTY_RATE: RateDraft = {
  metric: "ai_tokens_input",
  unit_size: "1000000",
  amount: "",
  included: "",
};

export function PublishPriceSheet({
  open,
  onOpenChange,
  planId,
  planName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string | undefined;
  planName: string;
}) {
  const { showAlert } = useAlert();
  const publish = usePublishPrice();

  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [effectiveFrom, setEffectiveFrom] = useState(todayInputValue());
  const [rates, setRates] = useState<RateDraft[]>([]);

  const amountCents = parseMoneyToCents(amount);
  const ready = planId !== undefined && amountCents !== null && effectiveFrom !== "";

  async function submit() {
    if (planId === undefined || amountCents === null) return;
    try {
      await publish.mutateAsync({
        plan_id: planId,
        // Celda SIN tramo: módulos, enterprise y filas legado. Las celdas de
        // paquete con tramo se publican por lote desde la rejilla.
        volume_tier_code: null,
        override_reason: null,
        interval,
        amount_cents: amountCents,
        currency: "COP",
        // La licencia SaaS va excluida de IVA (Art. 476 num. 21 del Estatuto
        // Tributario). No se ofrece elegirlo: si algún día hay que tarifar algo
        // gravado, será una decisión consciente y no un desplegable.
        tax_treatment: "excluded",
        tax_rate_bps: 0,
        effective_from: new Date(`${effectiveFrom}T00:00:00Z`).toISOString(),
        overage_rates: rates.flatMap((rate) => {
          const perUnit = parseMoneyToCents(rate.amount);
          const size = Number(rate.unit_size);
          if (perUnit === null || !Number.isFinite(size) || size <= 0) return [];
          return [
            {
              metric: rate.metric,
              unit_size: size,
              amount_cents_per_unit: perUnit,
              included_quantity: rate.included === "" ? null : Number(rate.included),
              tax_treatment: "excluded" as const,
              tax_rate_bps: 0,
            },
          ];
        }),
      });
      showAlert({
        tone: "success",
        title: "Tarifa publicada",
        description: `${planName} pasa a ${formatMoney(amountCents)} desde el ${effectiveFrom}. La vigencia anterior queda cerrada.`,
        autoCloseMs: 7000,
      });
      onOpenChange(false);
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo publicar",
        description: errorMessage(error),
        autoCloseMs: 9000,
      });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Publicar nueva tarifa"
      subtitle={planName}
    >
      <div className="flex flex-col gap-5 p-5">
        <p className="text-muted-foreground border-info/24 bg-info/8 rounded-xl border p-3 text-xs leading-relaxed">
          Publicar <b>cierra la vigencia anterior</b> y crea una nueva. Las facturas
          ya emitidas conservan el precio con el que se vendieron: por eso una tarifa
          se sucede en vez de editarse.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="price-amount">Importe de la cuota *</Label>
            <Input
              id="price-amount"
              className="mt-1.5 tabular-nums"
              inputMode="numeric"
              placeholder="990.000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">Excluido de IVA</p>
          </div>

          <div>
            <Label htmlFor="price-from">Vigente desde *</Label>
            <Input
              id="price-from"
              type="date"
              className="mt-1.5 tabular-nums"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="price-interval">Periodicidad</Label>
            <Select
              value={interval}
              onValueChange={(value) => setInterval(value as "monthly" | "annual")}
            >
              <SelectTrigger id="price-interval" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <section>
          <header className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Excedentes facturables</h3>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                El <b>bloque</b> es lo que se cobra cada vez que se supera, no el total
                incluido. Dejar «incluido» vacío toma el tope del plan del tenant.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRates((prev) => [...prev, { ...EMPTY_RATE }])}
            >
              <Plus aria-hidden="true" />
              Añadir
            </Button>
          </header>

          {rates.length === 0 ? (
            <p className="text-muted-foreground border-border rounded-xl border border-dashed p-3 text-xs">
              Sin excedentes: solo se cobra la cuota.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rates.map((rate, index) => (
                <li
                  key={index}
                  className="border-border flex flex-wrap items-end gap-2 rounded-xl border p-2.5"
                >
                  <Select
                    value={rate.metric}
                    onValueChange={(value) =>
                      setRates((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, metric: value as OverageMetric } : item,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="min-w-[178px] flex-1" aria-label="Métrica">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OVERAGE_METRICS.map((metric) => (
                        <SelectItem key={metric} value={metric}>
                          {OVERAGE_METRIC_LABELS[metric]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    className="w-[116px] tabular-nums"
                    inputMode="numeric"
                    aria-label="Precio por bloque"
                    placeholder="Precio"
                    value={rate.amount}
                    onChange={(event) =>
                      setRates((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, amount: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    className="w-[124px] tabular-nums"
                    inputMode="numeric"
                    aria-label="Tamaño del bloque"
                    placeholder="Bloque"
                    value={rate.unit_size}
                    onChange={(event) =>
                      setRates((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, unit_size: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    className="w-[112px] tabular-nums"
                    inputMode="numeric"
                    aria-label="Cantidad incluida"
                    placeholder="Incluido"
                    value={rate.included}
                    onChange={(event) =>
                      setRates((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, included: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Quitar ${OVERAGE_METRIC_LABELS[rate.metric]}`}
                    onClick={() =>
                      setRates((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!ready || publish.isPending} onClick={() => void submit()}>
            Publicar tarifa
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}

/** `YYYY-MM-DD` de hoy, para el valor inicial del input de fecha. */
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}
