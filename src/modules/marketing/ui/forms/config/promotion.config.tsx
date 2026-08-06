import { z } from "zod";
import { PriceInput } from "@/shared/components/features/price-input";
import {
  createCustomField,
  createInputField,
  type FieldConfig,
} from "@/shared/components/features/dynamic-form";
import { VariantPicker, type VariantSelection } from "@/modules/catalog/public";
import { PROMOTION_KIND_LABELS, PROMOTION_KIND_ORDER } from "@/modules/marketing/domain/enums";
import {
  giftVariantLabel,
  type CreatePromotionDTO,
  type PromotionDTO,
  type UpdatePromotionDTO,
} from "@/modules/marketing/domain/promotion";

/**
 * Formulario de promoción.
 *
 * La regla que lo gobierna: el backend exige EXACTAMENTE el parámetro del
 * `kind` elegido y rechaza cualquier otro (422 `promotion_invalid_params`). Por
 * eso el formulario muestra uno solo (`isVisible`), el `superRefine` lo exige, y
 * `toCreatePromotionDTO` manda `null` en los otros tres en vez de arrastrar lo
 * que el usuario tecleó antes de cambiar de tipo.
 */

const KIND_VALUES = PROMOTION_KIND_ORDER;

export const promotionFormSchema = z
  .object({
    name: z.string().trim().min(3, "Mínimo 3 caracteres").max(80, "Máximo 80 caracteres"),
    kind: z.enum(KIND_VALUES),
    percent: z.number().int().min(1).max(100).nullable(),
    amount_cents: z.number().int().min(1).nullable(),
    gift: z
      .object({ variant_id: z.string(), label: z.string() })
      .nullable(),
    shipping_value_cents: z.number().int().min(1).nullable(),
    min_order_cents: z.number().int().min(0).nullable(),
    shared_code: z.string().trim().max(24, "Máximo 24 caracteres"),
    validity_hours: z.number().int().min(1).max(2160).nullable(),
    starts_at: z.string(),
    ends_at: z.string(),
    max_redemptions_total: z.number().int().min(1).nullable(),
    max_redemptions_per_contact: z.number().int().min(1).max(100),
    enabled: z.boolean(),
  })
  .superRefine((values, ctx) => {
    // Cada tipo exige SU parámetro; el mensaje va al campo visible, no a un
    // banner genérico que obliga a adivinar cuál falta.
    if (values.kind === "percent_discount" && values.percent === null) {
      ctx.addIssue({ code: "custom", path: ["percent"], message: "Indica el porcentaje" });
    }
    if (values.kind === "fixed_discount" && values.amount_cents === null) {
      ctx.addIssue({ code: "custom", path: ["amount_cents"], message: "Indica el monto" });
    }
    if (values.kind === "gift_product" && values.gift === null) {
      ctx.addIssue({ code: "custom", path: ["gift"], message: "Elige el producto de regalo" });
    }
    if (values.kind === "free_shipping" && values.shipping_value_cents === null) {
      ctx.addIssue({
        code: "custom",
        path: ["shipping_value_cents"],
        message: "Indica cuánto cubres de flete",
      });
    }
    // Un código compartido de 1–2 caracteres lo rechaza el backend: se avisa aquí.
    if (values.shared_code !== "" && values.shared_code.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["shared_code"],
        message: "El código necesita al menos 3 caracteres",
      });
    }
    if (values.starts_at !== "" && values.ends_at !== "" && values.ends_at < values.starts_at) {
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "La fecha de fin no puede ser anterior al inicio",
      });
    }
  });

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export const defaultPromotionFormValues: PromotionFormValues = {
  name: "",
  kind: "percent_discount",
  percent: null,
  amount_cents: null,
  gift: null,
  shipping_value_cents: null,
  min_order_cents: null,
  shared_code: "",
  validity_hours: null,
  starts_at: "",
  ends_at: "",
  max_redemptions_total: null,
  max_redemptions_per_contact: 1,
  enabled: false,
};

/** ISO → `yyyy-mm-dd` para `<input type="date">`. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** `yyyy-mm-dd` → ISO a medianoche local, o `null` si está vacío. */
function fromDateInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function promotionToFormValues(promotion: PromotionDTO): PromotionFormValues {
  return {
    name: promotion.name,
    kind: promotion.kind,
    percent: promotion.percent,
    amount_cents: promotion.amount_cents,
    gift:
      promotion.gift_variant_id !== null
        ? {
            variant_id: promotion.gift_variant_id,
            // El backend embebe la variante resuelta: ya no hace falta ni un
            // uuid a la vista ni recorrer el catálogo para etiquetarla.
            label: giftVariantLabel(promotion) ?? promotion.gift_variant_id,
          }
        : null,
    shipping_value_cents: promotion.shipping_value_cents,
    min_order_cents: promotion.min_order_cents,
    shared_code: promotion.shared_code ?? "",
    validity_hours: promotion.validity_hours,
    starts_at: toDateInput(promotion.starts_at),
    ends_at: toDateInput(promotion.ends_at),
    max_redemptions_total: promotion.max_redemptions_total,
    max_redemptions_per_contact: promotion.max_redemptions_per_contact,
    enabled: promotion.enabled,
  };
}

/** Solo el parámetro del `kind` elegido viaja con valor; el resto va `null`. */
function paramsForKind(values: PromotionFormValues) {
  return {
    percent: values.kind === "percent_discount" ? values.percent : null,
    amount_cents: values.kind === "fixed_discount" ? values.amount_cents : null,
    gift_variant_id: values.kind === "gift_product" ? (values.gift?.variant_id ?? null) : null,
    shipping_value_cents: values.kind === "free_shipping" ? values.shipping_value_cents : null,
  };
}

export function toCreatePromotionDTO(values: PromotionFormValues): CreatePromotionDTO {
  return {
    name: values.name.trim(),
    kind: values.kind,
    ...paramsForKind(values),
    min_order_cents: values.min_order_cents,
    shared_code: values.shared_code.trim() ? values.shared_code.trim().toUpperCase() : null,
    validity_hours: values.validity_hours,
    starts_at: fromDateInput(values.starts_at),
    ends_at: fromDateInput(values.ends_at),
    max_redemptions_total: values.max_redemptions_total,
    max_redemptions_per_contact: values.max_redemptions_per_contact,
    enabled: values.enabled,
  };
}

export function toUpdatePromotionDTO(values: PromotionFormValues): UpdatePromotionDTO {
  return toCreatePromotionDTO(values);
}

/** Campo numérico entero que emite `null` cuando se vacía. */
function numberField(
  name: keyof PromotionFormValues & string,
  label: string,
  options: {
    placeholder?: string;
    help?: string;
    min?: number;
    max?: number;
    suffix?: string;
    isVisible?: (values: PromotionFormValues) => boolean;
  } = {},
): FieldConfig<PromotionFormValues> {
  return createCustomField<PromotionFormValues>(
    name,
    ({ value, setValue, getError }) => (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={options.min}
            max={options.max}
            value={value === null || value === undefined ? "" : String(value)}
            placeholder={options.placeholder}
            aria-invalid={Boolean(getError())}
            onChange={(e) => {
              const raw = e.target.value;
              setValue(
                name as never,
                (raw === "" ? null : Number(raw)) as never,
              );
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20"
          />
          {options.suffix && (
            <span className="shrink-0 text-sm text-muted-foreground">{options.suffix}</span>
          )}
        </div>
        {getError() ? (
          <p className="text-xs text-destructive">{getError()}</p>
        ) : (
          options.help && <p className="text-xs text-muted-foreground">{options.help}</p>
        )}
      </div>
    ),
    { label, isVisible: options.isVisible },
  );
}

/** Campo de dinero (centavos) sobre el `PriceInput` compartido. */
function moneyField(
  name: keyof PromotionFormValues & string,
  label: string,
  options: {
    help?: string;
    isVisible?: (values: PromotionFormValues) => boolean;
  } = {},
): FieldConfig<PromotionFormValues> {
  return createCustomField<PromotionFormValues>(
    name,
    ({ value, setValue, getError }) => (
      <div className="space-y-1">
        <PriceInput
          value={(value as number | null) ?? null}
          onChange={(cents) => setValue(name as never, cents as never)}
          aria-invalid={Boolean(getError())}
        />
        {getError() ? (
          <p className="text-xs text-destructive">{getError()}</p>
        ) : (
          options.help && <p className="text-xs text-muted-foreground">{options.help}</p>
        )}
      </div>
    ),
    { label, isVisible: options.isVisible },
  );
}

export function buildPromotionFormFields(): ReadonlyArray<FieldConfig<PromotionFormValues>> {
  return [
    createInputField<PromotionFormValues>("name", {
      label: "Nombre",
      placeholder: "Vuelve y ahorra",
      colSpan: { base: 1, md: 2 },
    }),

    createCustomField<PromotionFormValues>(
      "kind",
      ({ value, setValue }) => (
        <div className="flex flex-wrap gap-2">
          {KIND_VALUES.map((kind) => {
            const checked = value === kind;
            return (
              <label
                key={kind}
                className={
                  checked
                    ? "flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-primary bg-accent px-3 py-2 text-sm font-medium"
                    : "flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent/60"
                }
              >
                <input
                  type="radio"
                  name="promotion-kind"
                  className="accent-primary"
                  checked={checked}
                  onChange={() => setValue("kind", kind)}
                />
                <span className="whitespace-nowrap">{PROMOTION_KIND_LABELS[kind]}</span>
              </label>
            );
          })}
        </div>
      ),
      { label: "Qué le das al cliente", colSpan: { base: 1, md: 2 } },
    ),

    // Un solo parámetro visible a la vez: el que exige el tipo elegido.
    numberField("percent", "Porcentaje", {
      suffix: "%",
      min: 1,
      max: 100,
      placeholder: "25",
      help: "Entre 1 y 100.",
      isVisible: (v) => v.kind === "percent_discount",
    }),
    moneyField("amount_cents", "Monto del descuento", {
      isVisible: (v) => v.kind === "fixed_discount",
    }),
    moneyField("shipping_value_cents", "Valor del flete que cubres", {
      isVisible: (v) => v.kind === "free_shipping",
    }),
    createCustomField<PromotionFormValues>(
      "gift",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <VariantPicker
            value={
              value
                ? {
                    variant_id: (value as { variant_id: string }).variant_id,
                    label: (value as { label: string }).label,
                  }
                : null
            }
            onChange={(selection: VariantSelection | null) =>
              setValue(
                "gift",
                (selection
                  ? { variant_id: selection.variant_id, label: selection.label }
                  : null) as never,
              )
            }
            error={getError()}
          />
          <p className="text-xs text-muted-foreground">
            Se añade al pedido como una línea de $ 0 marcada como regalo.
          </p>
        </div>
      ),
      {
        label: "Producto de regalo",
        colSpan: { base: 1, md: 2 },
        isVisible: (v) => v.kind === "gift_product",
      },
    ),

    moneyField("min_order_cents", "Pedido mínimo", {
      help: "Déjalo vacío si aplica a cualquier pedido.",
    }),
    createInputField<PromotionFormValues>("shared_code", {
      label: "Código compartido (opcional)",
      placeholder: "VUELVE10",
      description: "Para escribirlo en una campaña: «usa el código VUELVE10».",
      inputProps: { style: { textTransform: "uppercase" }, maxLength: 24 },
    }),

    numberField("validity_hours", "Vigencia del cupón", {
      suffix: "horas",
      min: 1,
      max: 2160,
      placeholder: "6",
      help: "El cupón expira de verdad: pasada la hora, el sistema lo rechaza.",
    }),
    numberField("max_redemptions_per_contact", "Tope por contacto", {
      min: 1,
      max: 100,
    }),
    numberField("max_redemptions_total", "Tope total de canjes", {
      min: 1,
      placeholder: "Sin tope",
      help: "Vacío = sin límite.",
    }),

    createInputField<PromotionFormValues>("starts_at", {
      label: "Válida desde",
      inputKind: "date",
      description: "Vacío = desde ahora.",
    }),
    createInputField<PromotionFormValues>("ends_at", {
      label: "Válida hasta (opcional)",
      inputKind: "date",
    }),
  ];
}
