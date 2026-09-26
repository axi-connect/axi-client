import { z } from "zod";

import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
  UpdateDocumentsSettingsDTO,
} from "@/modules/documents/domain/template";
import {
  CONTRACT_ISSUE_OPTIONS,
  type ContractIssue,
} from "@/modules/documents/domain/automation";

export { CONTRACT_ISSUE_OPTIONS, type ContractIssue };

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
 * «Saldrá como JX-2026-0100»: el prefijo escrito en el formulario (vacío = el
 * de fábrica), el año en curso y el número elegido. Con el contador ya
 * empezado, el número es el del servidor y no se mueve.
 */
export function numberingExample(input: {
  prefix: string;
  fallbackPrefix: string;
  startAt: string;
  started: boolean;
  nextValue: number;
  year?: number;
}): string {
  const prefix =
    input.prefix.trim() === ""
      ? input.fallbackPrefix
      : input.prefix.trim().toUpperCase();
  const typed = /^[1-9]\d{0,6}$/.test(input.startAt.trim())
    ? Number(input.startAt.trim())
    : input.nextValue;
  const value = input.started ? input.nextValue : typed;
  return `${prefix}-${String(input.year ?? new Date().getFullYear())}-${String(value).padStart(4, "0")}`;
}
