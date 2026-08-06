import { z } from "zod";
import { PriceInput } from "@/shared/components/features/price-input";
import {
  createCustomField,
  createInputField,
  type FieldConfig,
} from "@/shared/components/features/dynamic-form";
import type {
  AutomationDTO,
  CreateAutomationDTO,
  UpdateAutomationDTO,
} from "@/modules/marketing/domain/automation";
import { compactConditions, parseConditions, requiresHsm } from "@/modules/marketing/domain/automation";
import {
  TRIGGER_DESCRIPTIONS,
  TRIGGER_LABELS,
  TRIGGER_ORDER,
  type TriggerType,
} from "@/modules/marketing/domain/enums";
import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import {
  invalidTemplateVariables,
  MAX_MESSAGE_TEMPLATE_LENGTH,
  MIN_MESSAGE_TEMPLATE_LENGTH,
  TEMPLATE_VARIABLES,
} from "@/modules/marketing/domain/template";
import { MessageTemplateField } from "@/modules/marketing/ui/components/MessageTemplateField";

/**
 * Editor de una regla de recuperación.
 *
 * El formulario está ordenado como la pregunta que responde: cuándo se dispara,
 * a quién le aplica, qué le ofrece y qué le dice. Ese orden no es estético — es
 * el que permite decidir sin saltar entre bloques.
 *
 * Todas las condiciones son opcionales y `{}` significa "aplica a todos", así
 * que el formulario nunca las exige; lo que sí valida es lo que el backend
 * rechazaría: variables inventadas en el mensaje y el rango de score cruzado.
 */

const LIFECYCLE_STAGES = ["prospect", "lead", "customer", "other"] as const;
const INTENT_TYPES = ["sales", "support", "technical", "onboarding", "follow_up"] as const;

const LIFECYCLE_LABELS: Record<(typeof LIFECYCLE_STAGES)[number], string> = {
  prospect: "Prospecto",
  lead: "Lead",
  customer: "Cliente",
  other: "Otro",
};

const INTENT_LABELS: Record<(typeof INTENT_TYPES)[number], string> = {
  sales: "Ventas",
  support: "Soporte",
  technical: "Técnica",
  onboarding: "Onboarding",
  follow_up: "Seguimiento",
};

export const NO_PROMOTION = "__none__";
const ANY_INTENT = "__any__";

export const automationFormSchema = z
  .object({
    name: z.string().trim().min(3, "Mínimo 3 caracteres").max(80, "Máximo 80 caracteres"),
    trigger_type: z.enum(TRIGGER_ORDER),
    delay_minutes: z
      .number()
      .int()
      .min(5, "Mínimo 5 minutos: el barrido corre cada 5")
      .max(43_200, "Máximo 30 días"),
    priority: z.number().int().min(1).max(1000),
    // Condiciones (todas opcionales)
    has_active_cart: z.boolean(),
    include_pending: z.boolean(),
    min_score: z.number().int().min(0).max(100).nullable(),
    max_score: z.number().int().min(0).max(100).nullable(),
    lifecycle_stage_in: z.array(z.enum(LIFECYCLE_STAGES)),
    min_cart_total_cents: z.number().int().min(0).nullable(),
    intent_type: z.enum(INTENT_TYPES).nullable(),
    // Estrategia y mensaje
    promotion_id: z.string(),
    message_template: z
      .string()
      .trim()
      .min(MIN_MESSAGE_TEMPLATE_LENGTH, "El mensaje es demasiado corto")
      .max(MAX_MESSAGE_TEMPLATE_LENGTH, `Máximo ${MAX_MESSAGE_TEMPLATE_LENGTH} caracteres`),
    hsm_template_name: z.string().trim().max(120),
    hsm_template_language: z.string().trim().max(10),
    attribution_window_hours: z.number().int().min(1).max(720),
  })
  .superRefine((values, ctx) => {
    if (
      values.min_score !== null &&
      values.max_score !== null &&
      values.min_score > values.max_score
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["max_score"],
        message: "El máximo no puede ser menor que el mínimo",
      });
    }
    // El backend responde 422 `invalid_template_variables`: se avisa antes de
    // que el usuario pierda lo escrito.
    const invalid = invalidTemplateVariables(values.message_template);
    if (invalid.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["message_template"],
        message: `Estas variables no existen: ${invalid.map((v) => `{{${v}}}`).join(", ")}`,
      });
    }
  });

export type AutomationFormValues = z.infer<typeof automationFormSchema>;

export function defaultAutomationFormValues(trigger: TriggerType): AutomationFormValues {
  return {
    name: "",
    trigger_type: trigger,
    delay_minutes: trigger === "deal_stalled" ? 4320 : 15,
    priority: 1,
    has_active_cart: false,
    include_pending: false,
    min_score: null,
    max_score: null,
    lifecycle_stage_in: [],
    min_cart_total_cents: null,
    intent_type: null,
    promotion_id: NO_PROMOTION,
    message_template: "",
    hsm_template_name: "",
    hsm_template_language: "es",
    attribution_window_hours: 168,
  };
}

export function automationToFormValues(automation: AutomationDTO): AutomationFormValues {
  const conditions = parseConditions(automation.conditions);
  return {
    name: automation.name,
    trigger_type: automation.trigger_type,
    delay_minutes: automation.delay_minutes,
    priority: automation.priority,
    has_active_cart: conditions.has_active_cart ?? false,
    include_pending: conditions.include_pending ?? false,
    min_score: conditions.min_score ?? null,
    max_score: conditions.max_score ?? null,
    lifecycle_stage_in: conditions.lifecycle_stage_in ?? [],
    min_cart_total_cents: conditions.min_cart_total_cents ?? null,
    intent_type: conditions.intent_type ?? null,
    promotion_id: automation.promotion?.id ?? NO_PROMOTION,
    message_template: automation.message_template,
    hsm_template_name: automation.hsm_template_name ?? "",
    hsm_template_language: automation.hsm_template_language ?? "es",
    attribution_window_hours: automation.attribution_window_hours,
  };
}

function conditionsFromValues(values: AutomationFormValues) {
  return compactConditions({
    // `false` no es una condición: "no exijo carrito activo" es no filtrar.
    ...(values.has_active_cart && { has_active_cart: true }),
    ...(values.trigger_type === "cart_abandoned" &&
      values.include_pending && { include_pending: true }),
    ...(values.min_score !== null && { min_score: values.min_score }),
    ...(values.max_score !== null && { max_score: values.max_score }),
    ...(values.lifecycle_stage_in.length > 0 && {
      lifecycle_stage_in: values.lifecycle_stage_in,
    }),
    ...(values.min_cart_total_cents !== null && {
      min_cart_total_cents: values.min_cart_total_cents,
    }),
    ...(values.intent_type !== null && { intent_type: values.intent_type }),
  });
}

export function toCreateAutomationDTO(values: AutomationFormValues): CreateAutomationDTO {
  const usesHsm = requiresHsm(values.trigger_type) && values.hsm_template_name.trim() !== "";
  return {
    name: values.name.trim(),
    trigger_type: values.trigger_type,
    delay_minutes: values.delay_minutes,
    priority: values.priority,
    conditions: conditionsFromValues(values),
    promotion_id: values.promotion_id === NO_PROMOTION ? null : values.promotion_id,
    message_template: values.message_template.trim(),
    // La plantilla de Meta solo tiene sentido en el disparador que escribe
    // fuera de la ventana de 24 h; en los demás se manda null aunque el campo
    // conserve texto de una edición anterior.
    hsm_template_name: usesHsm ? values.hsm_template_name.trim() : null,
    hsm_template_language: usesHsm ? values.hsm_template_language.trim() || "es" : null,
    attribution_window_hours: values.attribution_window_hours,
    // NUNCA se enciende desde el formulario: es una decisión aparte y explícita.
    enabled: false,
  };
}

export function toUpdateAutomationDTO(values: AutomationFormValues): UpdateAutomationDTO {
  const dto: UpdateAutomationDTO = toCreateAutomationDTO(values);
  // `enabled` NO viaja en la edición: `toCreateAutomationDTO` lo fija en false,
  // y mandarlo apagaría una regla activa al guardar un cambio de texto.
  delete dto.enabled;
  return dto;
}

function numberField(
  name: keyof AutomationFormValues & string,
  label: string,
  options: {
    suffix?: string;
    help?: string;
    min?: number;
    max?: number;
    placeholder?: string;
    nullable?: boolean;
    isVisible?: (values: AutomationFormValues) => boolean;
  } = {},
): FieldConfig<AutomationFormValues> {
  return createCustomField<AutomationFormValues>(
    name,
    ({ value, setValue, getError }) => (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={options.min}
            max={options.max}
            placeholder={options.placeholder}
            value={value === null || value === undefined ? "" : String(value)}
            aria-invalid={Boolean(getError())}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = raw === "" ? (options.nullable ? null : 0) : Number(raw);
              setValue(name as never, parsed as never);
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

function chipToggleField<T extends string>(
  name: keyof AutomationFormValues & string,
  label: string,
  choices: readonly T[],
  labels: Record<T, string>,
  help: string,
): FieldConfig<AutomationFormValues> {
  return createCustomField<AutomationFormValues>(
    name,
    ({ value, setValue }) => {
      const selected = (value as T[] | undefined) ?? [];
      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {choices.map((choice) => {
              const on = selected.includes(choice);
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setValue(
                      name as never,
                      (on
                        ? selected.filter((s) => s !== choice)
                        : [...selected, choice]) as never,
                    )
                  }
                  className={
                    on
                      ? "rounded-full border border-primary bg-accent px-2.5 py-1 text-xs font-medium"
                      : "rounded-full border border-input px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                  }
                >
                  {labels[choice]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.length === 0 ? help : `Solo estas ${selected.length}`}
          </p>
        </div>
      );
    },
    { label, colSpan: { base: 1, md: 2 } },
  );
}

export function buildAutomationFormFields(options: {
  promotions: PromotionDTO[];
  editing: boolean;
}): ReadonlyArray<FieldConfig<AutomationFormValues>> {
  return [
    createInputField<AutomationFormValues>("name", {
      label: "Nombre de la regla",
      placeholder: "Carrito con cupón",
      colSpan: { base: 1, md: 2 },
    }),

    // ① Cuándo
    createCustomField<AutomationFormValues>(
      "trigger_type",
      ({ value, setValue }) => (
        <div className="flex flex-col gap-1.5">
          {TRIGGER_ORDER.map((trigger) => {
            const checked = value === trigger;
            return (
              <label
                key={trigger}
                className={
                  checked
                    ? "flex cursor-pointer items-start gap-2.5 rounded-md border border-primary bg-accent px-3 py-2.5"
                    : "flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-accent/60"
                }
              >
                <input
                  type="radio"
                  name="automation-trigger"
                  className="mt-0.5 accent-primary"
                  checked={checked}
                  // Cambiar de disparador en una regla ya creada cambiaría el
                  // significado de sus métricas: se crea otra regla.
                  disabled={options.editing}
                  onChange={() => setValue("trigger_type", trigger)}
                />
                <span>
                  <span className="block text-sm font-medium">{TRIGGER_LABELS[trigger]}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {TRIGGER_DESCRIPTIONS[trigger]}
                  </span>
                </span>
              </label>
            );
          })}
          {options.editing && (
            <p className="text-xs text-muted-foreground">
              El disparador no se cambia: sus métricas dejarían de significar lo mismo. Crea otra
              regla si necesitas uno distinto.
            </p>
          )}
        </div>
      ),
      { label: "Cuándo se dispara", colSpan: { base: 1, md: 2 } },
    ),

    numberField("delay_minutes", "Cuánto se espera", {
      suffix: "minutos",
      min: 5,
      max: 43_200,
      help: "Mínimo 5 minutos, máximo 30 días.",
    }),
    numberField("priority", "Prioridad", {
      min: 1,
      max: 1000,
      help: "Si varias reglas del mismo disparador coinciden, gana la de número más bajo.",
    }),

    createCustomField<AutomationFormValues>(
      "include_pending",
      ({ value, setValue }) => (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-accent/60">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={Boolean(value)}
            onChange={(e) => setValue("include_pending", e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">
              Incluir también pedidos pendientes de pago
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              No solo los que quedaron en borrador.
            </span>
          </span>
        </label>
      ),
      {
        label: "",
        colSpan: { base: 1, md: 2 },
        isVisible: (v) => v.trigger_type === "cart_abandoned",
      },
    ),

    // ② A quién
    chipToggleField(
      "lifecycle_stage_in",
      "Etapa del contacto",
      LIFECYCLE_STAGES,
      LIFECYCLE_LABELS,
      "Cualquier etapa",
    ),

    numberField("min_score", "Score mínimo del CRM", {
      min: 0,
      max: 100,
      nullable: true,
      placeholder: "Cualquiera",
    }),
    numberField("max_score", "Score máximo", {
      min: 0,
      max: 100,
      nullable: true,
      placeholder: "Cualquiera",
    }),

    createCustomField<AutomationFormValues>(
      "min_cart_total_cents",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <PriceInput
            value={(value as number | null) ?? null}
            onChange={(cents) => setValue("min_cart_total_cents", cents as never)}
            aria-invalid={Boolean(getError())}
          />
          <p className="text-xs text-muted-foreground">
            Vacío = cualquier carrito, por pequeño que sea.
          </p>
        </div>
      ),
      { label: "Carrito mínimo" },
    ),

    createCustomField<AutomationFormValues>(
      "intent_type",
      ({ value, setValue }) => (
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
          value={(value as string | null) ?? ANY_INTENT}
          onChange={(e) =>
            setValue(
              "intent_type",
              (e.target.value === ANY_INTENT ? null : e.target.value) as never,
            )
          }
        >
          <option value={ANY_INTENT}>Cualquiera</option>
          {INTENT_TYPES.map((intent) => (
            <option key={intent} value={intent}>
              {INTENT_LABELS[intent]}
            </option>
          ))}
        </select>
      ),
      { label: "Intención de la conversación" },
    ),

    createCustomField<AutomationFormValues>(
      "has_active_cart",
      ({ value, setValue }) => (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent/60">
          <input
            type="checkbox"
            className="accent-primary"
            checked={Boolean(value)}
            onChange={(e) => setValue("has_active_cart", e.target.checked)}
          />
          Solo si el contacto tiene un carrito activo
        </label>
      ),
      { label: "", colSpan: { base: 1, md: 2 } },
    ),

    // ③ Qué le ofreces
    createCustomField<AutomationFormValues>(
      "promotion_id",
      ({ value, setValue }) => (
        <div className="space-y-1">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
            value={String(value ?? NO_PROMOTION)}
            onChange={(e) => setValue("promotion_id", e.target.value)}
          >
            <option value={NO_PROMOTION}>Sin promoción — solo mensaje</option>
            {options.promotions.map((promotion) => (
              <option key={promotion.id} value={promotion.id}>
                {promotion.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {options.promotions.length === 0
              ? "No tienes promociones activas. Sin promoción, la regla envía solo el mensaje."
              : "Sin promoción sirve para prueba social: «14 personas compraron esto esta semana»."}
          </p>
        </div>
      ),
      { label: "Promoción", colSpan: { base: 1, md: 2 } },
    ),

    // ④ Qué le dices
    createCustomField<AutomationFormValues>(
      "message_template",
      ({ value, setValue, getError }) => (
        <MessageTemplateField
          value={String(value ?? "")}
          onChange={(next) => setValue("message_template", next)}
          // En automatizaciones se rellenan TODAS: hay episodio, carrito y
          // cupón personal por ejecución.
          available={TEMPLATE_VARIABLES}
          error={getError()}
        />
      ),
      { label: "Mensaje", colSpan: { base: 1, md: 2 } },
    ),

    // ⑤ Ajuste fino
    numberField("attribution_window_hours", "Ventana de atribución", {
      suffix: "horas",
      min: 1,
      max: 720,
      help: "Cuánto tiempo después del mensaje se le atribuye una compra.",
    }),
    createInputField<AutomationFormValues>("hsm_template_name", {
      label: "Plantilla de Meta",
      placeholder: "recuperacion_deal",
      description: "Obligatoria para encender esta regla: escribe fuera de la ventana de 24 h.",
      isVisible: (v) => requiresHsm(v.trigger_type),
    }),
  ];
}
