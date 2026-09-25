"use client";

/**
 * Los campos de «Preparar entrega» como config de `DynamicForm`. Cada campo
 * sabe en qué paso vive (`isVisible`), así que un solo formulario cubre los
 * cuatro pasos y conserva lo escrito al saltar entre pestañas.
 */
import { AlertTriangle } from "lucide-react";
import { useController, type Control } from "react-hook-form";
import {
  createCustomField,
  createInputField,
  type FieldConfig,
} from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import type { DeliveryStepId } from "../../../domain/delivery";
import type { OfferCatalogWire } from "../../../infrastructure/api/delivery.dto";
import { CcChipsInput } from "./CcChipsInput";
import type { DeliveryFormValues } from "./delivery-form.config";

/** Radix Select no admite `""` como valor: «sin promoción» viaja así y se traduce. */
const NO_PROMOTION = "__none__";

type SelectName =
  | "offer.package_code"
  | "offer.volume_tier_code"
  | "offer.promotion_code"
  | "offer.billing_period";

function SelectField({
  control,
  name,
  label,
  options,
  emptyValue,
}: {
  control: Control<DeliveryFormValues>;
  name: SelectName;
  label: string;
  options: readonly { value: string; label: string }[];
  /** El valor del Select que equivale a `""` en el formulario. */
  emptyValue?: string;
}) {
  const { field, fieldState } = useController({ control, name });
  const current = field.value === "" && emptyValue ? emptyValue : String(field.value ?? "");
  return (
    <Select
      value={current}
      onValueChange={(next) => field.onChange(emptyValue && next === emptyValue ? "" : next)}
    >
      <SelectTrigger className="w-full" aria-label={label} aria-invalid={Boolean(fieldState.error)} onBlur={field.onBlur}>
        <SelectValue placeholder="Elige una opción" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RestartTrialField({
  control,
  rangeLabel,
  disabled,
}: {
  control: Control<DeliveryFormValues>;
  rangeLabel: string;
  disabled: boolean;
}) {
  const { field } = useController({ control, name: "restart_trial" });
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
      <Switch
        checked={Boolean(field.value)}
        onCheckedChange={field.onChange}
        disabled={disabled}
        aria-describedby="restart-trial-range"
        className="mt-0.5"
      />
      <span className="min-w-0 text-sm">
        <span className="font-medium">Reiniciar la prueba desde hoy</span>
        <span id="restart-trial-range" className="block text-xs text-muted-foreground">
          {rangeLabel}
        </span>
      </span>
    </label>
  );
}

function CcField({ control, ownerEmail }: { control: Control<DeliveryFormValues>; ownerEmail: string | null }) {
  const { field, fieldState } = useController({ control, name: "cc" });
  return (
    <CcChipsInput
      id="delivery-cc"
      value={(field.value as string[] | undefined) ?? []}
      onChange={field.onChange}
      ownerEmail={ownerEmail}
      invalid={Boolean(fieldState.error)}
    />
  );
}

/** El aviso del servidor bajo una cita (fin de semana), o la ayuda de siempre. */
function CallHint({ warning, fallback }: { warning: string | null; fallback: string }) {
  if (!warning) return <>{fallback}</>;
  return (
    <span className="flex items-start gap-1 text-warning">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
      <span>{warning}</span>
    </span>
  );
}

export type DeliveryFieldsInput = {
  step: DeliveryStepId;
  catalog: OfferCatalogWire;
  ownerEmail: string | null;
  /** «jue 24 sep → jue 1 oct a las 11:59 p. m. (hora de Bogotá) · 75 conversaciones con IA». */
  restartRangeLabel: string;
  /** La prueba no admite reinicio (enterprise o suspendida por otra causa). */
  restartDisabled: boolean;
  warnings: { call_day2_at: string | null; call_day5_at: string | null };
  /** La lectura es-CO de lo escrito en cada campo de fecha u hora (QA H2-7). */
  echo: {
    session_date: string | null;
    call_day2_at: string | null;
    call_day5_at: string | null;
    digest_time: string | null;
  };
};

/** «Día 0 · jue 24 sep»: la ayuda y, si hay valor, cómo se lee en es-CO. */
function withEcho(hint: string, echo: string | null): string {
  return echo ? `${echo} · ${hint}` : hint;
}

function percentLabel(bps: number): string {
  return `${(bps / 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
}

export function buildDeliveryFields(input: DeliveryFieldsInput): FieldConfig<DeliveryFormValues>[] {
  const { step, catalog } = input;
  const on = (target: DeliveryStepId) => () => step === target;
  // Una columna desde lg: ahí la vista previa va al lado y dos columnas no caben (A3).
  const full = { base: 1, md: 2, lg: 1 } as const;

  const promotionOptions = [
    ...(catalog.promotion
      ? [{ value: catalog.promotion.code, label: `${catalog.promotion.name} · ${percentLabel(catalog.promotion.percent_bps)}` }]
      : []),
    { value: NO_PROMOTION, label: "Sin promoción" },
  ];

  return [
    // ------------------------------------------------------------ 1 · Oferta
    createCustomField<DeliveryFormValues>(
      "offer.package_code",
      ({ control }) => (
        <SelectField
          control={control}
          name="offer.package_code"
          label="Paquete"
          options={catalog.packages.map((pkg) => ({ value: pkg.code, label: pkg.name }))}
        />
      ),
      { label: "Paquete", isVisible: on("offer") },
    ),
    createCustomField<DeliveryFormValues>(
      "offer.volume_tier_code",
      ({ control }) => (
        <SelectField
          control={control}
          name="offer.volume_tier_code"
          label="Conversaciones al mes"
          options={catalog.tiers.map((tier) => ({ value: tier.code, label: tier.label }))}
        />
      ),
      { label: "Conversaciones al mes", isVisible: on("offer") },
    ),
    createCustomField<DeliveryFormValues>(
      "offer.promotion_code",
      ({ control }) => (
        <SelectField
          control={control}
          name="offer.promotion_code"
          label="Promoción"
          options={promotionOptions}
          emptyValue={NO_PROMOTION}
        />
      ),
      { label: "Promoción", isVisible: on("offer") },
    ),
    createCustomField<DeliveryFormValues>(
      "offer.billing_period",
      ({ control }) => (
        <SelectField
          control={control}
          name="offer.billing_period"
          label="Periodicidad"
          options={[
            { value: "monthly", label: "Mensual" },
            { value: "annual", label: "Anual" },
          ]}
        />
      ),
      { label: "Periodicidad", isVisible: on("offer") },
    ),

    // ------------------------------------------------------------ 2 · Prueba y citas
    createCustomField<DeliveryFormValues>(
      "restart_trial",
      ({ control }) => (
        <RestartTrialField control={control} rangeLabel={input.restartRangeLabel} disabled={input.restartDisabled} />
      ),
      { isVisible: on("trial"), colSpan: full },
    ),
    createInputField<DeliveryFormValues>("session_date", {
      inputKind: "date",
      label: "Sesión de puesta en marcha",
      description: withEcho("Día 0", input.echo.session_date),
      isVisible: on("trial"),
    }),
    createInputField<DeliveryFormValues>("digest_time", {
      inputKind: "time",
      label: "Resumen de cada mañana",
      description: withEcho("Lo cumple la consola de Cuentas", input.echo.digest_time),
      isVisible: on("trial"),
    }),
    createInputField<DeliveryFormValues>("call_day2_at", {
      inputKind: "datetime-local",
      label: "Día 2 · llamada de 10 min",
      description: (
        <CallHint warning={input.warnings.call_day2_at ? withEcho(input.warnings.call_day2_at, input.echo.call_day2_at) : null} fallback={withEcho("Va en el correo como .ics", input.echo.call_day2_at)} />
      ),
      isVisible: on("trial"),
    }),
    createInputField<DeliveryFormValues>("call_day5_at", {
      inputKind: "datetime-local",
      label: "Día 5 · reunión de 15 min",
      description: (
        <CallHint warning={input.warnings.call_day5_at ? withEcho(input.warnings.call_day5_at, input.echo.call_day5_at) : null} fallback={withEcho("Va en el correo como .ics", input.echo.call_day5_at)} />
      ),
      isVisible: on("trial"),
    }),

    // ------------------------------------------------------------ 3 · Correo
    createCustomField<DeliveryFormValues>(
      "cc",
      ({ control }) => <CcField control={control} ownerEmail={input.ownerEmail} />,
      {
        label: "Copia a tu equipo",
        htmlFor: "delivery-cc",
        description:
          "Reciben una copia aparte, en un envío propio, donde el botón dice «El dueño recibió su enlace de acceso». El enlace de la contraseña solo viaja en el correo del dueño.",
        isVisible: on("mail"),
        colSpan: full,
      },
    ),
    createInputField<DeliveryFormValues>("advisor.name", {
      label: "Firma",
      placeholder: "Camila Restrepo",
      autoComplete: "name",
      isVisible: on("mail"),
    }),
    createInputField<DeliveryFormValues>("advisor.whatsapp_e164", {
      inputKind: "tel",
      label: "WhatsApp del asesor",
      placeholder: "+57 300 482 1937",
      autoComplete: "tel",
      description: "Se recuerda para tus próximos envíos",
      isVisible: on("mail"),
    }),
    createInputField<DeliveryFormValues>("advisor.email", {
      inputKind: "email",
      label: "Correo para las respuestas",
      placeholder: "camila@axi-connect.co",
      autoComplete: "email",
      description: "Cuando el dueño responde el correo, le llega a este buzón.",
      isVisible: on("mail"),
      colSpan: full,
    }),
  ];
}
