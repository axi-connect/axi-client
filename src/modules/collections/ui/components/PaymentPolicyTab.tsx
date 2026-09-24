"use client";

import { useCallback, useEffect, useState } from "react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  INSTALLMENT_KIND_LABELS,
  type CollectionsPolicyDTO,
  type PlanPreviewDTO,
} from "@/modules/collections/domain/payment-plan";
import {
  getCollectionsPolicy,
  previewPlan,
  saveCollectionsPolicy,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";

/** Expedición de ejemplo: US$ 3.500 que sale dentro de seis meses. */
const SAMPLE_CENTS = 10_850_000;

function sampleServiceDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}

/**
 * Cómo reparte sus cobros el negocio (F4 del programa Cobros).
 *
 * Filas de ajustes —etiqueta a la izquierda, valor a la derecha, la explicación
 * debajo del grupo— y NO una rejilla de formulario: una rejilla con sus pistas
 * se lee como panel de administración.
 *
 * Al lado, el calendario que esos números producen para una expedición real. Un
 * «30 % de anticipo» suelto no se puede juzgar; el calendario que genera, sí.
 */
export function PaymentPolicyTab() {
  const { showAlert } = useAlert();
  const [policy, setPolicy] = useState<CollectionsPolicyDTO | null>(null);
  const [preview, setPreview] = useState<PlanPreviewDTO | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCollectionsPolicy()
      .then(setPolicy)
      .catch((err: unknown) => {
        setBlocked(isHttpError(err) && err.is(API_ERROR_CODES.featureDisabled));
      });
  }, []);

  useEffect(() => {
    if (policy === null) return;
    void previewPlan({
      total_cents: SAMPLE_CENTS,
      service_date: sampleServiceDate(),
    })
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [policy]);

  const patch = useCallback((changes: Partial<CollectionsPolicyDTO>) => {
    setPolicy((current) =>
      current === null ? current : { ...current, ...changes },
    );
  }, []);

  async function save() {
    if (policy === null) return;
    setSaving(true);
    try {
      const saved = await saveCollectionsPolicy(policy);
      setPolicy(saved);
      showAlert({
        tone: "success",
        title: "Política guardada",
        autoCloseMs: 3000,
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar",
        description: errorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }

  if (blocked) {
    return (
      <p className="text-sm text-muted-foreground">
        Este negocio no tiene planes de pago. Se activan en Mi empresa ›
        Funciones.
      </p>
    );
  }
  if (policy === null) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_352px]">
      <div>
        <section>
          <p className="px-1 pb-2.5 text-[13px] font-medium text-muted-foreground">
            Cómo se reparte el pago
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <NumberRow
              label="Anticipo para reservar"
              suffix="%"
              value={policy.deposit_pct}
              onChange={(deposit_pct) => patch({ deposit_pct })}
            />
            <div className="relative grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-border/60">
              <label className="text-sm" htmlFor="policy-strategy">
                Cómo se reparte el resto
              </label>
              <Select
                value={policy.installments_strategy}
                onValueChange={(value) =>
                  patch({
                    installments_strategy:
                      value as CollectionsPolicyDTO["installments_strategy"],
                  })
                }
              >
                <SelectTrigger id="policy-strategy" className="h-8 w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal_monthly">
                    Cuotas mensuales
                  </SelectItem>
                  <SelectItem value="single_balance">
                    Un solo saldo final
                  </SelectItem>
                  <SelectItem value="custom_count">
                    Un número fijo de cuotas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* El número solo se ofrece cuando MANDA. Con cuotas mensuales las
                decide el calendario, así que un campo editable que no cambia
                nada es peor que no tenerlo: el operador prueba, guarda y no
                pasa nada. */}
            {policy.installments_strategy === "custom_count" ? (
              <NumberRow
                label="Cuotas además del anticipo"
                value={policy.installments_count}
                onChange={(installments_count) => patch({ installments_count })}
              />
            ) : null}
            <NumberRow
              label="El saldo se paga antes de salir"
              suffix="días"
              value={policy.final_due_days_before_service}
              onChange={(final_due_days_before_service) =>
                patch({ final_due_days_before_service })
              }
            />
            <NumberRow
              label="Si no hay fecha de salida"
              suffix="días"
              value={policy.fallback_term_days}
              onChange={(fallback_term_days) => patch({ fallback_term_days })}
            />
          </div>
          <p className="max-w-[62ch] px-1 pt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Se aplica a cada pedido al confirmarlo; lo que ya tiene plan no
            cambia. Un abono menor al anticipo igual reserva: eso lo decide
            quien verifica.
          </p>
        </section>

        <section className="mt-7">
          <p className="px-1 pb-2.5 text-[13px] font-medium text-muted-foreground">
            Cuándo se da por vencida
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <NumberRow
              label="Días de gracia antes de la mora"
              suffix="días"
              value={policy.grace_days}
              onChange={(grace_days) => patch({ grace_days })}
            />
          </div>
          <p className="max-w-[62ch] px-1 pt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            La gracia es parte del trato y viaja congelada con cada plan, como
            las fechas. Cuándo y cómo se avisa —que no se pactó con nadie— se
            decide en{" "}
            <b className="font-medium text-foreground">Recordatorios</b> y
            alcanza también a los pedidos que ya están en marcha.
          </p>
        </section>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => void save()} disabled={saving}>
            Guardar política
          </Button>
        </div>
      </div>

      <aside className="rounded-[20px] border border-border bg-background p-6">
        <p className="text-[12.5px] text-muted-foreground">
          Con esta política, una expedición de
        </p>
        <p className="mt-0.5 text-[15.5px] font-semibold tracking-[-0.01em]">
          {formatMoney(SAMPLE_CENTS)} que sale en seis meses
        </p>
        {preview === null ? (
          <Skeleton className="mt-4 h-40 w-full rounded-xl" />
        ) : (
          <ol className="mt-4 flex flex-col">
            {preview.installments.map((installment, index) => (
              <li
                key={installment.seq}
                className="relative grid grid-cols-[12px_minmax(0,1fr)_auto] items-start gap-3.5 py-2.5"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-[9px] justify-self-center rounded-full ${
                    index === 0
                      ? "bg-brand"
                      : index === preview.installments.length - 1
                        ? "bg-foreground"
                        : "bg-border"
                  }`}
                />
                <div>
                  <p className="text-[13.5px] font-medium">
                    {installment.kind === "installment"
                      ? `Cuota ${String(installment.seq)}`
                      : INSTALLMENT_KIND_LABELS[installment.kind]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatShortDate(installment.due_at)}
                  </p>
                </div>
                <span className="text-[13.5px] font-medium tabular-nums">
                  {formatMoney(installment.amount_cents)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="pt-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
          Este calendario no es un ejemplo escrito a mano: sale de los números
          de la izquierda. Cambia el anticipo y se mueve contigo.
        </p>
      </aside>
    </div>
  );
}

function NumberRow({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:inset-x-4 [&:not(:first-child)]:before:top-0 [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:bg-border/60">
      <label className="text-sm" htmlFor={`policy-${label}`}>
        {label}
      </label>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Input
          id={`policy-${label}`}
          inputMode="numeric"
          value={String(value)}
          onChange={(event) =>
            onChange(Number(event.target.value.replace(/\D/g, "")) || 0)
          }
          className="h-8 w-20 text-right tabular-nums"
        />
        {suffix === undefined ? null : suffix}
      </span>
    </div>
  );
}
