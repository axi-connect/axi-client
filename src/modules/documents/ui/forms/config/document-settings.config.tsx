"use client";

import { useFormContext, useWatch, type Control } from "react-hook-form";
import {
  Check,
  Mail,
  MessageCircle,
  Receipt,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { z } from "zod";

import { cn } from "@/core/lib/utils";
import {
  createCustomField,
  createInputField,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form/types";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
  UpdateDocumentsSettingsDTO,
} from "@/modules/documents/domain/template";

/** Los mismos límites que el servidor (`documents.dto.ts`); su 400 los confirma. */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${String(max)} caracteres`);
const PREFIX = /^[A-Z0-9]{1,6}$/;
/** Los mismos patrones que el servidor para la plantilla de respaldo (Meta). */
const HSM_NAME = /^[a-z0-9_]{1,512}$/;
const HSM_LANGUAGE = /^[a-z]{2}(_[A-Z]{2})?$/;

/**
 * F9: cuándo sale el contrato solo. Tres opciones EXCLUYENTES en el formulario
 * aunque el wire lleve dos booleanos: encender los dos sería emitir el mismo
 * contrato dos veces (la idempotencia lo dedupe, pero es ruido).
 */
export const CONTRACT_ISSUE_OPTIONS = [
  "never",
  "on_confirm",
  "on_deposit_verified",
] as const;
export type ContractIssue = (typeof CONTRACT_ISSUE_OPTIONS)[number];

export const CONTRACT_ISSUE_LABELS: Record<
  ContractIssue,
  { title: string; description: string }
> = {
  never: {
    title: "Nunca solo",
    description: "Lo emites tú desde el pedido, cuando quieras.",
  },
  on_confirm: {
    title: "Al confirmar el pedido",
    description: "En cuanto el pedido pasa a confirmado, con o sin dinero.",
  },
  on_deposit_verified: {
    title: "Al verificar el anticipo",
    description:
      "Con plan de pagos, cuando la cuota del anticipo queda saldada. Sin plan, con el primer pago verificado.",
  },
};

export const documentSettingsSchema = z
  .object({
    legal_name: optional(200),
    tax_id_label: z
      .string()
      .trim()
      .min(1, "Requerido")
      .max(20, "Máximo 20 caracteres"),
    address: optional(200),
    city: optional(200),
    phone: optional(40),
    email: z.union([
      z.literal(""),
      z.string().trim().email("Correo inválido").max(200),
    ]),
    footer_note: optional(600),
    prefixes: z.record(
      z.string(),
      z.union([
        z.literal(""),
        z.string().trim().toUpperCase().regex(PREFIX, "1 a 6 letras o números"),
      ]),
    ),
    /**
     * F8: «siguiente número» por tipo. Solo se manda lo que cambió y solo se
     * puede editar con el contador virgen (el servidor responde 409 si no).
     */
    start_at: z.record(
      z.string(),
      z.union([
        z.literal(""),
        z
          .string()
          .trim()
          .regex(/^[1-9]\d{0,6}$/, "Un entero desde 1"),
      ]),
    ),
    // F9: emisión y envío automáticos. Campos PLANOS para que `DynamicForm` los
    // vigile uno a uno; `toSettingsPayload` los vuelve a anidar como el wire.
    contract_issue: z.enum(CONTRACT_ISSUE_OPTIONS),
    receipt_on_payment_verified: z.boolean(),
    send_contract_whatsapp: z.boolean(),
    send_contract_email: z.boolean(),
    send_receipt_whatsapp: z.boolean(),
    send_receipt_email: z.boolean(),
    hsm_name: z.union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(HSM_NAME, "Como en Meta: minúsculas, números y guion bajo"),
    ]),
    hsm_language: z.union([
      z.literal(""),
      z.string().trim().regex(HSM_LANGUAGE, "Ej.: es, es_CO, en_US"),
    ]),
  })
  .superRefine((values, ctx) => {
    // Ambos o ninguno: un idioma sin plantilla no manda nada; el idioma vacío
    // con plantilla cae a `es` en el payload, así que no se marca.
    if (values.hsm_name === "" && values.hsm_language !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hsm_name"],
        message: "Escribe el nombre de la plantilla o deja el idioma vacío",
      });
    }
  });

export type DocumentSettingsFormValues = z.infer<typeof documentSettingsSchema>;

const issuable = (types: readonly DocumentTypeView[]) =>
  types.filter((type) => type.issuable);

function nextOf(dto: DocumentsSettingsDTO, code: string) {
  return dto.numbering.next[code as keyof typeof dto.numbering.next];
}

export function fromSettingsDto(
  dto: DocumentsSettingsDTO,
  types: readonly DocumentTypeView[],
): DocumentSettingsFormValues {
  return {
    start_at: Object.fromEntries(
      issuable(types).map((type) => [
        type.code,
        String(nextOf(dto, type.code)?.next_value ?? 1),
      ]),
    ),
    legal_name: dto.issuer.legal_name ?? "",
    tax_id_label: dto.issuer.tax_id_label,
    address: dto.issuer.address ?? "",
    city: dto.issuer.city ?? "",
    phone: dto.issuer.phone ?? "",
    email: dto.issuer.email ?? "",
    footer_note: dto.issuer.footer_note ?? "",
    prefixes: Object.fromEntries(
      types
        .filter((type) => type.issuable)
        .map((type) => [
          type.code,
          dto.numbering.prefixes[
            type.code as keyof typeof dto.numbering.prefixes
          ] ?? "",
        ]),
    ),
    contract_issue: contractIssueOf(dto.auto_issue),
    receipt_on_payment_verified: dto.auto_issue.receipt_on_payment_verified,
    send_contract_whatsapp: dto.auto_send.contract.whatsapp,
    send_contract_email: dto.auto_send.contract.email,
    send_receipt_whatsapp: dto.auto_send.receipt.whatsapp,
    send_receipt_email: dto.auto_send.receipt.email,
    hsm_name: dto.hsm_fallback?.name ?? "",
    hsm_language: dto.hsm_fallback?.language ?? "",
  };
}

/**
 * Dos booleanos → una opción. Datos viejos con los dos en true caen a «al
 * confirmar», que es el que dispara primero (el otro llegaría deduplicado).
 */
export function contractIssueOf(
  autoIssue: DocumentsSettingsDTO["auto_issue"],
): ContractIssue {
  if (autoIssue.contract_on_confirm) return "on_confirm";
  if (autoIssue.contract_on_deposit_verified) return "on_deposit_verified";
  return "never";
}

/**
 * El PUT es de sección: lo vacío viaja como null y cae a la ficha de Mi
 * empresa. `start_at` viaja SOLO con lo que cambió respecto al contador que el
 * servidor enseñó: mandar los valores sin tocar sería pedir mover contadores
 * que ya empezaron y ganarse un 409 por nada.
 */
export function toSettingsPayload(
  values: DocumentSettingsFormValues,
  current?: DocumentsSettingsDTO,
): UpdateDocumentsSettingsDTO {
  const startAt = Object.fromEntries(
    Object.entries(values.start_at)
      .filter(([code, raw]) => {
        if (raw === "") return false;
        const next = current === undefined ? undefined : nextOf(current, code);
        if (next?.started === true) return false;
        return next === undefined || Number(raw) !== next.next_value;
      })
      .map(([code, raw]) => [code, Number(raw)]),
  ) as NonNullable<UpdateDocumentsSettingsDTO["numbering"]["start_at"]>;
  const orNull = (value: string) => (value.trim() === "" ? null : value.trim());
  const prefixes = Object.fromEntries(
    Object.entries(values.prefixes)
      .filter(([, prefix]) => prefix !== "")
      .map(([code, prefix]) => [code, prefix.toUpperCase()]),
  ) as UpdateDocumentsSettingsDTO["numbering"]["prefixes"];
  return {
    issuer: {
      legal_name: orNull(values.legal_name),
      tax_id_label: values.tax_id_label.trim(),
      address: orNull(values.address),
      city: orNull(values.city),
      phone: orNull(values.phone),
      email: orNull(values.email),
      footer_note: orNull(values.footer_note),
    },
    numbering: {
      prefixes,
      ...(Object.keys(startAt).length > 0 ? { start_at: startAt } : {}),
    },
    auto_issue: {
      contract_on_confirm: values.contract_issue === "on_confirm",
      contract_on_deposit_verified:
        values.contract_issue === "on_deposit_verified",
      receipt_on_payment_verified: values.receipt_on_payment_verified,
    },
    auto_send: {
      contract: {
        whatsapp: values.send_contract_whatsapp,
        email: values.send_contract_email,
      },
      receipt: {
        whatsapp: values.send_receipt_whatsapp,
        email: values.send_receipt_email,
      },
    },
    // Sin nombre no hay plantilla (null apaga el respaldo); el idioma vacío es `es`.
    hsm_fallback:
      values.hsm_name.trim() === ""
        ? null
        : {
            name: values.hsm_name.trim(),
            language:
              values.hsm_language.trim() === ""
                ? "es"
                : values.hsm_language.trim(),
          },
  };
}

/**
 * Campos del emisor y la numeración. Los placeholders del emisor son la ficha
 * de Mi empresa: lo que quede vacío cae a ella, y el placeholder lo dice. Los
 * prefijos se generan por tipo emitible desde el catálogo por el wire.
 */
export function buildDocumentSettingsFields(input: {
  types: readonly DocumentTypeView[];
  defaults: DocumentsSettingsDTO["company_defaults"];
  prefixDefaults: DocumentsSettingsDTO["prefix_defaults"];
  /** F8: dónde está cada consecutivo; con `started` el campo se bloquea y lo dice. */
  next?: DocumentsSettingsDTO["numbering"]["next"];
}): FieldConfig<DocumentSettingsFormValues>[] {
  const { types, defaults, prefixDefaults, next } = input;
  const issuer: FieldConfig<DocumentSettingsFormValues>[] = [
    createInputField("legal_name", {
      label: "Razón social",
      placeholder: defaults.name,
      description: "Vacío: sale el nombre del negocio.",
    }),
    createInputField("tax_id_label", {
      label: "Etiqueta del NIT",
      description: `Se imprime delante de ${defaults.nit}: «NIT», «RUT», «CIF»…`,
    }),
    createInputField("address", {
      label: "Dirección",
      placeholder: defaults.address ?? "Sin dirección en Mi empresa",
      description: "Vacío: la de Mi empresa.",
    }),
    createInputField("city", {
      label: "Ciudad",
      placeholder: defaults.city ?? "Sin ciudad en Mi empresa",
      description: "Vacío: la de Mi empresa.",
    }),
    createInputField("phone", {
      label: "Teléfono",
      inputKind: "tel",
      description: "Sale en el pie y en «Partes».",
    }),
    createInputField("email", {
      label: "Correo",
      inputKind: "email",
      description: "Sale en el pie y en «Partes».",
    }),
    createInputField("footer_note", {
      label: "Nota al pie",
      inputKind: "textarea",
      colSpan: { base: 1, md: 2 },
      description:
        "Una línea que se imprime en todos los documentos, bajo el pie.",
    }),
  ];
  const prefixes = types
    .filter((type) => type.issuable)
    .map((type) =>
      createInputField(`prefixes.${type.code}` as `prefixes.${string}`, {
        label: `${type.label} · prefijo`,
        placeholder:
          prefixDefaults[type.code as keyof typeof prefixDefaults] ??
          type.default_prefix,
        description: `Ej.: ${prefixDefaults[type.code as keyof typeof prefixDefaults] ?? type.default_prefix}-2026-0001. Vacío: el de Axi.`,
        inputProps: { className: "font-mono uppercase", maxLength: 6 },
      }),
    );
  // F8: el «siguiente número» va al lado de su prefijo, tipo por tipo.
  const startAt = issuable(types).map((type) => {
    const state = next?.[type.code as keyof typeof next];
    const started = state?.started === true;
    const prefix =
      prefixDefaults[type.code as keyof typeof prefixDefaults] ??
      type.default_prefix;
    return createInputField(`start_at.${type.code}` as `start_at.${string}`, {
      label: `${type.label} · siguiente número`,
      description: started
        ? `Ya salió el primero: el siguiente será ${prefix}-…-${String(state?.next_value ?? 1).padStart(4, "0")}. La numeración no se mueve.`
        : `Para continuar una numeración que ya llevabas. Saldrá como ${prefix}-2026-${String(state?.next_value ?? 1).padStart(4, "0")}.`,
      isDisabled: () => started,
      inputProps: {
        className: "font-mono",
        inputMode: "numeric",
        maxLength: 7,
      },
    });
  });
  const numbering = prefixes.flatMap((prefixField, index) => {
    const startField = startAt[index];
    return startField === undefined ? [prefixField] : [prefixField, startField];
  });
  return [...issuer, ...numbering];
}

// ───────────────── F9: emisión y envío automáticos ─────────────────

type Values = DocumentSettingsFormValues;

/**
 * Tres tarjetas del formulario, cada una un campo «custom» que pinta su grupo
 * completo (el precedente es `QuietHoursField`: un campo dueño de varios).
 * Van a dos columnas para que la sección sea una lista agrupada, no una
 * grilla de controles sueltos.
 */
export function buildAutomationFields(): FieldConfig<Values>[] {
  const full = { colSpan: { base: 1, md: 2 } };
  return [
    createCustomField<Values>(
      "contract_issue",
      ({ control, value, setValue }) => (
        <IssueCard
          control={control}
          value={value as ContractIssue}
          onChange={(next) => setValue("contract_issue", next)}
          onReceipt={(on) => setValue("receipt_on_payment_verified", on)}
        />
      ),
      { ...full, containerClassName: "mt-2" },
    ),
    createCustomField<Values>(
      "send_contract_whatsapp",
      ({ control, setValue }) => (
        <AutoSendCard
          control={control}
          onChange={(name, on) => setValue(name, on)}
        />
      ),
      full,
    ),
    createCustomField<Values>(
      "hsm_name",
      ({ control, value, setValue, getError }) => (
        <HsmCard
          control={control}
          name={(value as string) ?? ""}
          nameError={getError()}
          onName={(next) => setValue("hsm_name", next)}
          onLanguage={(next) => setValue("hsm_language", next)}
        />
      ),
      full,
    ),
  ];
}

function Card({
  title,
  lead,
  children,
}: {
  title: string;
  lead: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="px-5 pt-4 pb-1.5">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
        <p className="mt-0.5 max-w-[66ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {lead}
        </p>
      </div>
      {children}
    </div>
  );
}

/** Una fila de la lista: glifo en cápsula, título, explicación, interruptor grande. */
function SwitchRow({
  icon: Icon,
  title,
  description,
  warning,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: React.ReactNode;
  warning?: string | null;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="relative grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3.5 px-5 py-3.5 [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-0 [&+&]:before:left-[68px] [&+&]:before:h-px [&+&]:before:bg-border/50">
      <span className="grid size-[34px] place-items-center rounded-[10px] bg-secondary text-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        {warning ? (
          // §9.4: la pista de dependencia es un estado que dura → Alert, color solo en el icono.
          <Alert variant="warning" className="mt-2 py-2">
            <TriangleAlert aria-hidden="true" />
            <AlertDescription className="text-[12.5px]">
              <span>{warning}</span>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function IssueCard({
  control,
  value,
  onChange,
  onReceipt,
}: {
  control: Control<Values>;
  value: ContractIssue;
  onChange: (next: ContractIssue) => void;
  onReceipt: (on: boolean) => void;
}) {
  const receipt = useWatch({ control, name: "receipt_on_payment_verified" });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="flex items-center gap-2 text-base font-medium">
          <Zap aria-hidden="true" className="size-4" />
          Emisión y envío automáticos
        </h3>
        <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
          Lo que sale solo lleva el mismo papel, número y datos que si lo
          emitieras tú. Actúa sobre lo que se emite desde ahora; lo ya emitido
          no se reenvía solo.
        </p>
      </div>
      <Card
        title="Cuándo se emite el contrato"
        lead="Sale con los datos del pedido de ese momento y su consecutivo. Se manda según los interruptores de abajo."
      >
        <div
          role="radiogroup"
          aria-label="Cuándo se emite el contrato"
          className="grid gap-2.5 px-5 pt-2.5 pb-4 sm:grid-cols-3"
        >
          {CONTRACT_ISSUE_OPTIONS.map((option) => {
            const checked = value === option;
            const copy = CONTRACT_ISSUE_LABELS[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onChange(option)}
                className={cn(
                  "relative flex flex-col gap-1.5 rounded-2xl border border-border bg-background px-3.5 py-3.5 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  checked &&
                    "border-foreground ring-1 ring-foreground ring-inset",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-3 right-3 grid size-[18px] place-items-center rounded-full border-[1.5px] border-border",
                    checked &&
                      "border-foreground bg-foreground text-background",
                  )}
                >
                  {checked ? <Check className="size-[11px]" /> : null}
                </span>
                <span className="pr-6 text-sm font-semibold tracking-[-0.005em]">
                  {copy.title}
                </span>
                <span className="text-[12.5px] leading-[1.45] text-muted-foreground">
                  {copy.description}
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-border/50">
          <SwitchRow
            icon={Receipt}
            title="Recibo automático"
            description="Con cada pago verificado sale un recibo a nombre del cliente."
            checked={receipt}
            onChange={onReceipt}
          />
        </div>
      </Card>
    </div>
  );
}

type SendField =
  | "send_contract_whatsapp"
  | "send_contract_email"
  | "send_receipt_whatsapp"
  | "send_receipt_email";

/**
 * Los interruptores de envío SOLO gobiernan lo que se emite solo; lo manual
 * pasa por el diálogo. La pista de dependencia (WhatsApp encendido sin
 * plantilla) se calcula con `useWatch`: cambia mientras escribes.
 */
function AutoSendCard({
  control,
  onChange,
}: {
  control: Control<Values>;
  onChange: (name: SendField, on: boolean) => void;
}) {
  const [cw, ce, rw, re, hsm] = useWatch({
    control,
    name: [
      "send_contract_whatsapp",
      "send_contract_email",
      "send_receipt_whatsapp",
      "send_receipt_email",
      "hsm_name",
    ],
  });
  const noHsm = hsm.trim() === "";
  const hint =
    "Fuera de las 24 h no saldrá el PDF hasta que configures la plantilla de abajo.";
  return (
    <Card
      title="Por dónde se manda lo que sale solo"
      lead={
        <>
          Aplica a lo que se{" "}
          <b className="font-medium text-foreground">emite solo</b>. Lo que
          emites tú se manda desde el pedido, eligiendo el canal.
        </>
      }
    >
      <div className="mt-1.5 border-t border-border/50">
        <SwitchRow
          icon={MessageCircle}
          title="Contrato · WhatsApp"
          description="Al quedar listo, le llega al chat como PDF."
          warning={cw && noHsm ? hint : null}
          checked={cw}
          onChange={(on) => onChange("send_contract_whatsapp", on)}
        />
        <SwitchRow
          icon={Mail}
          title="Contrato · correo"
          description="Solo si el contacto tiene correo en su ficha; si no, la fila del pedido lo dice."
          checked={ce}
          onChange={(on) => onChange("send_contract_email", on)}
        />
        <SwitchRow
          icon={MessageCircle}
          title="Recibo · WhatsApp"
          description="Cada recibo, al quedar listo."
          warning={rw && noHsm ? hint : null}
          checked={rw}
          onChange={(on) => onChange("send_receipt_whatsapp", on)}
        />
        <SwitchRow
          icon={Mail}
          title="Recibo · correo"
          description="Solo si el contacto tiene correo en su ficha."
          checked={re}
          onChange={(on) => onChange("send_receipt_email", on)}
        />
      </div>
    </Card>
  );
}

function HsmCard({
  control,
  name,
  nameError,
  onName,
  onLanguage,
}: {
  control: Control<Values>;
  name: string;
  nameError: string | undefined;
  onName: (next: string) => void;
  onLanguage: (next: string) => void;
}) {
  const language = useWatch({ control, name: "hsm_language" });
  const { getFieldState, formState } = useFormContext<Values>();
  const languageError = getFieldState("hsm_language", formState).error?.message;
  return (
    <Card
      title="Plantilla aprobada de respaldo"
      lead={
        <>
          WhatsApp solo deja escribir libremente durante 24 h desde el último
          mensaje del cliente. Pasadas, sale esta plantilla y{" "}
          <b className="font-medium text-foreground">el PDF cuando responda</b>.
        </>
      }
    >
      <div className="grid gap-3 px-5 pt-2 pb-5 sm:grid-cols-[minmax(0,1fr)_130px]">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] text-muted-foreground">
            Nombre de la plantilla en Meta
          </span>
          <Input
            value={name}
            onChange={(event) => onName(event.target.value)}
            placeholder="documento_listo"
            className="font-mono text-[13px]"
            autoComplete="off"
            aria-invalid={nameError !== undefined}
            maxLength={512}
          />
          {nameError !== undefined ? (
            <span className="mt-1 block text-xs text-destructive">
              {nameError}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] text-muted-foreground">
            Idioma
          </span>
          <Input
            value={language}
            onChange={(event) => onLanguage(event.target.value)}
            placeholder="es"
            className="font-mono text-[13px]"
            autoComplete="off"
            aria-invalid={languageError !== undefined}
            maxLength={5}
          />
          {languageError !== undefined ? (
            <span className="mt-1 block text-xs text-destructive">
              {languageError}
            </span>
          ) : null}
        </label>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground sm:col-span-2">
          Tiene que ser una plantilla{" "}
          <b className="font-medium text-foreground">sin variables</b>: los
          ajustes solo guardan nombre e idioma, así que su texto debe valer para
          cualquier documento («tu documento está listo; respóndenos y te lo
          enviamos»). Vacío = fuera de las 24 h no se manda nada, y la fila lo
          dice.
        </p>
      </div>
    </Card>
  );
}
