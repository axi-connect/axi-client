"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import {
  planInstallmentLabel,
  type CollectionsPolicyDTO,
  type PlanPreviewDTO,
} from "@/modules/collections/domain/payment-plan";
import { isoDay } from "@/modules/collections/domain/promise";
import {
  getCollectionsPolicy,
  previewPlan,
  saveCollectionsPolicy,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";

/** Venta de ejemplo: $ 14.000.000 (≈ US$ 3.500), el tamaño de una expedición. */
const SAMPLE_CENTS = 14_000_000_00;

function sampleServiceDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return isoDay(date);
}

/** Los campos de esta pestaña; el resto de la política es de Recordatorios. */
const POLICY_FIELDS = [
  "deposit_pct",
  "installments_strategy",
  "installments_count",
  "final_due_days_before_service",
  "fallback_term_days",
  "grace_days",
] as const satisfies readonly (keyof CollectionsPolicyDTO)[];

const STRATEGY_ITEMS = [
  { value: "equal_monthly", label: "Mensuales" },
  { value: "custom_count", label: "Número fijo" },
  { value: "single_balance", label: "Un solo saldo" },
] as const;

const STRATEGY_HINTS: Record<
  CollectionsPolicyDTO["installments_strategy"],
  string
> = {
  equal_monthly: "Una cuota por mes entre la reserva y el día del saldo.",
  custom_count: "Siempre el mismo número de cuotas, parejas hasta el saldo.",
  single_balance: "Nada entre medias: el anticipo y, al final, el saldo.",
};

function changed(
  saved: CollectionsPolicyDTO,
  draft: CollectionsPolicyDTO,
): boolean {
  return POLICY_FIELDS.some((field) => saved[field] !== draft[field]);
}

/**
 * Cómo reparte sus cobros el negocio (F4 del programa Cobros; filas, isla y
 * barra de tinta en Cobros premium P4).
 *
 * Filas de ajustes —título y pista a la izquierda, el control a la derecha— y
 * NO una rejilla de formulario. Al lado, la isla con el calendario que esa
 * política produce para una venta de ejemplo: un «30 % de anticipo» suelto no
 * se puede juzgar; el calendario que genera, sí. Lo calcula el servidor con la
 * política GUARDADA, así que mientras haya cambios la isla lo dice.
 */
export function PaymentPolicyTab() {
  const { showAlert } = useAlert();
  const [saved, setSaved] = useState<CollectionsPolicyDTO | null>(null);
  const [draft, setDraft] = useState<CollectionsPolicyDTO | null>(null);
  const [preview, setPreview] = useState<PlanPreviewDTO | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceDate] = useState(sampleServiceDate);

  useEffect(() => {
    getCollectionsPolicy()
      .then((policy) => {
        setSaved(policy);
        setDraft(policy);
      })
      .catch((err: unknown) => {
        setBlocked(isHttpError(err) && err.is(API_ERROR_CODES.featureDisabled));
      });
  }, []);

  // Solo con lo guardado: el servidor previsualiza con la política que tiene.
  useEffect(() => {
    if (saved === null) return;
    let alive = true;
    setPreviewFailed(false);
    previewPlan({ total_cents: SAMPLE_CENTS, service_date: serviceDate })
      .then((result) => {
        if (alive) setPreview(result);
      })
      .catch(() => {
        if (alive) setPreviewFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [saved, serviceDate]);

  function patch(changes: Partial<CollectionsPolicyDTO>) {
    setDraft((current) =>
      current === null ? current : { ...current, ...changes },
    );
  }

  async function save() {
    if (draft === null) return;
    setSaving(true);
    try {
      const result = await saveCollectionsPolicy(draft);
      setSaved(result);
      setDraft(result);
      showAlert({ tone: "success", title: "Política guardada" });
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
  if (saved === null || draft === null)
    return <Skeleton className="h-64 w-full rounded-3xl" />;

  const dirty = changed(saved, draft);
  const invalid =
    draft.deposit_pct > 100 ||
    (draft.installments_strategy === "custom_count" &&
      draft.installments_count < 1);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) void save();
      }}
      onReset={(event) => {
        event.preventDefault();
        setDraft(saved);
      }}
    >
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] [&>*]:min-w-0">
        <div className="flex flex-col gap-4">
          <section
            aria-labelledby="policy-split"
            className="rounded-3xl border border-border bg-card px-5 md:px-6"
          >
            <h2
              id="policy-split"
              className="pt-5 pb-1 text-xs font-normal text-muted-foreground"
            >
              Cómo se reparte el pago
            </h2>
            <Row
              title="Anticipo para reservar"
              hint="Lo que se paga al confirmar. Un abono menor igual reserva: eso lo decide quien verifica."
            >
              <Stepper
                id="policy-deposit"
                label="Anticipo para reservar"
                value={draft.deposit_pct}
                step={5}
                max={100}
                suffix="%"
                invalid={draft.deposit_pct > 100}
                onChange={(deposit_pct) => patch({ deposit_pct })}
              />
            </Row>
            <Row
              title="Cómo se reparte el resto"
              hint={STRATEGY_HINTS[draft.installments_strategy]}
            >
              <SegmentedControl
                value={draft.installments_strategy}
                onValueChange={(installments_strategy) =>
                  patch({ installments_strategy })
                }
                items={STRATEGY_ITEMS}
                label="Cómo se reparte el resto"
                size="sm"
                treatment="lift"
              />
            </Row>
            {/* El número solo se ofrece cuando MANDA. Con cuotas mensuales las
                decide el calendario, así que un campo editable que no cambia
                nada es peor que no tenerlo: el operador prueba, guarda y no
                pasa nada. */}
            {draft.installments_strategy === "custom_count" ? (
              <Row
                title="Cuotas además del anticipo"
                hint="Parejas entre la reserva y el día del saldo."
              >
                <Stepper
                  id="policy-count"
                  label="Cuotas además del anticipo"
                  value={draft.installments_count}
                  min={1}
                  invalid={draft.installments_count < 1}
                  onChange={(installments_count) =>
                    patch({ installments_count })
                  }
                />
              </Row>
            ) : null}
            <Row
              title="El saldo se paga antes de salir"
              hint="Si alguien reserva más tarde, el saldo va junto con el anticipo."
            >
              <Stepper
                id="policy-final"
                label="El saldo se paga antes de salir"
                value={draft.final_due_days_before_service}
                step={5}
                suffix="días"
                onChange={(final_due_days_before_service) =>
                  patch({ final_due_days_before_service })
                }
              />
            </Row>
            <Row
              title="Si no hay fecha de salida"
              hint="El plazo del saldo cuando el pedido no tiene fecha de servicio."
            >
              <Stepper
                id="policy-fallback"
                label="Si no hay fecha de salida"
                value={draft.fallback_term_days}
                step={5}
                suffix="días"
                onChange={(fallback_term_days) => patch({ fallback_term_days })}
              />
            </Row>
          </section>

          <section
            aria-labelledby="policy-grace"
            className="rounded-3xl border border-border bg-card px-5 md:px-6"
          >
            <h2
              id="policy-grace"
              className="pt-5 pb-1 text-xs font-normal text-muted-foreground"
            >
              Cuándo se da por vencida
            </h2>
            <Row
              title="Días de gracia antes de la mora"
              hint="La gracia es parte del trato y viaja congelada con cada plan, como las fechas."
            >
              <Stepper
                id="policy-grace-days"
                label="Días de gracia antes de la mora"
                value={draft.grace_days}
                suffix="días"
                onChange={(grace_days) => patch({ grace_days })}
              />
            </Row>
          </section>

          <p className="max-w-[72ch] px-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Se aplica a cada pedido al confirmarlo; lo que ya tiene plan no
            cambia. Cuándo y cómo se avisa —que no se pactó con nadie— se decide
            en <b className="font-medium text-foreground">Recordatorios</b> y
            alcanza también a los pedidos que ya están en marcha.
          </p>
        </div>

        <InkIsland
          label="El calendario que produce"
          className="gap-3 xl:sticky xl:top-6"
        >
          <Kicker>El calendario que produce</Kicker>
          <p className="font-heading text-xl leading-tight font-bold tracking-tight md:text-2xl">
            Alguien reserva hoy una salida del {formatShortDate(serviceDate)}
          </p>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            Una venta de {formatMoney(SAMPLE_CENTS)}
          </p>
          {previewFailed ? (
            <p className="text-sm text-muted-foreground">
              No se pudo calcular el calendario de ejemplo.
            </p>
          ) : preview === null ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : (
            <ol
              aria-label="Calendario de ejemplo"
              className="m-0 flex list-none flex-col p-0"
            >
              {preview.installments.map((installment, index) => (
                <li
                  key={installment.seq}
                  className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-[26px] place-items-center rounded-full border-[1.5px] border-border text-[11px] font-semibold tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">
                      {planInstallmentLabel(installment, preview.installments)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatShortDate(installment.due_at)}
                    </span>
                  </span>
                  <span className="text-[13.5px] font-semibold whitespace-nowrap tabular-nums">
                    {formatMoney(installment.amount_cents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {dirty
              ? "Es el calendario de la política guardada: guarda para ver el de tus cambios."
              : "No es un ejemplo escrito a mano: sale de esta política, la misma que se congela en cada pedido."}
          </p>
        </InkIsland>
      </div>

      <UnsavedChangesDock
        dirty={dirty}
        submitting={saving}
        invalid={invalid}
        detail="Se aplica a los pedidos que se confirmen desde ahora."
        submitLabel="Guardar política"
      />
    </form>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/60 py-4 first-of-type:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 max-w-[56ch] text-[13px] leading-relaxed text-pretty text-muted-foreground">
          {hint}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** −, el número, +. El número se puede escribir: el paso es un atajo, no un límite. */
function Stepper({
  id,
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  invalid = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  invalid?: boolean;
}) {
  const clamp = (next: number) =>
    Math.max(min, max === undefined ? next : Math.min(max, next));
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-muted p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full bg-card"
          aria-label={`Bajar ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Input
          id={id}
          inputMode="numeric"
          aria-invalid={invalid}
          value={String(value)}
          onChange={(event) =>
            onChange(Number(event.target.value.replace(/\D/g, "")) || 0)
          }
          className={cn(
            "h-9 w-16 border-0 bg-transparent text-center font-semibold tabular-nums shadow-none",
            invalid && "text-destructive",
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full bg-card"
          aria-label={`Subir ${label.toLowerCase()}`}
          disabled={max !== undefined && value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      {suffix !== undefined ? (
        <span className="w-8 text-sm text-muted-foreground">{suffix}</span>
      ) : null}
    </div>
  );
}
