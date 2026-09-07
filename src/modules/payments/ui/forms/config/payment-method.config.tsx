"use client"

import { z } from "zod"
import type { FieldConfig } from "@/shared/components/features/dynamic-form"
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Switch } from "@/shared/components/ui/switch"
import {
  kindHasAccount,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_KINDS,
  type CreatePaymentMethodDTO,
  type PaymentMethodDTO,
  type PaymentMethodKind,
  type UpdatePaymentMethodDTO,
} from "@/modules/payments/domain/payment-method"

/** Topes del backend (`createPaymentMethodSchema`). */
export const paymentMethodFormSchema = z.object({
  kind: z.enum(PAYMENT_METHOD_KINDS as [PaymentMethodKind, ...PaymentMethodKind[]]),
  label: z.string().trim().min(1, "Nombre requerido").max(80, "Máximo 80 caracteres"),
  account_holder: z.string().trim().max(120, "Máximo 120 caracteres").optional().or(z.literal("")),
  account_number: z.string().trim().max(60, "Máximo 60 caracteres").optional().or(z.literal("")),
  instructions: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
  is_active: z.boolean(),
  visible_to_ai: z.boolean(),
})

export type PaymentMethodFormValues = z.infer<typeof paymentMethodFormSchema>

export const defaultPaymentMethodValues: PaymentMethodFormValues = {
  kind: "nequi",
  label: "",
  account_holder: "",
  account_number: "",
  instructions: "",
  is_active: true,
  visible_to_ai: true,
}

export function paymentMethodToFormValues(method: PaymentMethodDTO): PaymentMethodFormValues {
  return {
    kind: method.kind,
    label: method.label,
    account_holder: method.account_holder ?? "",
    account_number: method.account_number ?? "",
    instructions: method.instructions ?? "",
    is_active: method.is_active,
    visible_to_ai: method.visible_to_ai,
  }
}

function switchField(
  name: "is_active" | "visible_to_ai",
  title: string,
  help: string,
): FieldConfig<PaymentMethodFormValues> {
  return createCustomField<PaymentMethodFormValues>(name, ({ value, setValue }) => (
    <div className="flex items-center gap-3">
      <Switch
        id={`payment-method-${name}`}
        checked={value === true}
        onCheckedChange={(checked: boolean) => setValue(name, checked)}
      />
      <div>
        <Label htmlFor={`payment-method-${name}`} className="font-medium">
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{help}</p>
      </div>
    </div>
  ), { colSpan: { base: 2 } })
}

export function buildPaymentMethodFields(): ReadonlyArray<FieldConfig<PaymentMethodFormValues>> {
  return [
    createCustomField<PaymentMethodFormValues>("kind", ({ value, setValue }) => (
      <div className="flex flex-col gap-2">
        <Label htmlFor="payment-method-kind">Tipo</Label>
        <Select
          value={typeof value === "string" ? value : "nequi"}
          onValueChange={(next) => setValue("kind", next as PaymentMethodKind)}
        >
          <SelectTrigger id="payment-method-kind" className="w-full" aria-label="Tipo">
            <SelectValue placeholder="Elige el tipo" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHOD_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {PAYMENT_KIND_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )),
    createInputField<PaymentMethodFormValues>("label", {
      label: "Nombre",
      placeholder: "Nequi principal",
      description: "Así lo nombra la IA al cliente. Único por empresa.",
    }),
    createInputField<PaymentMethodFormValues>("account_holder", {
      label: "Titular",
      placeholder: "Mi empresa S.A.S.",
      isVisible: (values) => kindHasAccount(values.kind),
    }),
    createInputField<PaymentMethodFormValues>("account_number", {
      label: "Número o enlace",
      placeholder: "300 123 4567 o https://…",
      isVisible: (values) => kindHasAccount(values.kind),
    }),
    createInputField<PaymentMethodFormValues>("instructions", {
      label: "Instrucciones",
      inputKind: "textarea",
      placeholder: "Envía el comprobante por este mismo chat.",
      description: "Texto libre que la IA transmite tal cual.",
      colSpan: { base: 2 },
    }),
    switchField("is_active", "Activo", "Inactivo: no se ofrece ni aparece para la IA."),
    switchField(
      "visible_to_ai",
      "Visible para la IA",
      "Apagado: solo lo ven los operadores (p. ej. el datáfono de la tienda).",
    ),
  ] as const
}

export function toCreatePaymentMethodDTO(values: PaymentMethodFormValues): CreatePaymentMethodDTO {
  const withAccount = kindHasAccount(values.kind)
  return {
    kind: values.kind,
    label: values.label,
    ...(withAccount && values.account_holder ? { account_holder: values.account_holder } : {}),
    ...(withAccount && values.account_number ? { account_number: values.account_number } : {}),
    ...(values.instructions ? { instructions: values.instructions } : {}),
    is_active: values.is_active,
    visible_to_ai: values.visible_to_ai,
  }
}

/**
 * Semántica del PATCH: vacío + antes había valor ⇒ `null` (borra); vacío +
 * antes null ⇒ se omite (no viaja); valor ⇒ viaja. Un tipo sin cuenta
 * (efectivo, datáfono) borra titular y número si los tenía.
 */
export function toUpdatePaymentMethodDTO(
  values: PaymentMethodFormValues,
  original: PaymentMethodDTO,
): UpdatePaymentMethodDTO {
  const withAccount = kindHasAccount(values.kind)
  const nullable = (
    next: string | undefined,
    previous: string | null,
    allowed = true,
  ): string | null | undefined => {
    const clean = allowed ? (next ?? "") : ""
    if (clean.length > 0) return clean
    return previous === null ? undefined : null
  }
  const dto: UpdatePaymentMethodDTO = {
    kind: values.kind,
    label: values.label,
    is_active: values.is_active,
    visible_to_ai: values.visible_to_ai,
  }
  const holder = nullable(values.account_holder, original.account_holder, withAccount)
  const number = nullable(values.account_number, original.account_number, withAccount)
  const instructions = nullable(values.instructions, original.instructions)
  if (holder !== undefined) dto.account_holder = holder
  if (number !== undefined) dto.account_number = number
  if (instructions !== undefined) dto.instructions = instructions
  return dto
}
