import { z } from "zod";

import { createInputField } from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form/types";
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

export const documentSettingsSchema = z.object({
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
});

export type DocumentSettingsFormValues = z.infer<typeof documentSettingsSchema>;

export function fromSettingsDto(
  dto: DocumentsSettingsDTO,
  types: readonly DocumentTypeView[],
): DocumentSettingsFormValues {
  return {
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
  };
}

/** El PUT es de sección: lo vacío viaja como null y cae a la ficha de Mi empresa. */
export function toSettingsPayload(
  values: DocumentSettingsFormValues,
): UpdateDocumentsSettingsDTO {
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
    numbering: { prefixes },
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
}): FieldConfig<DocumentSettingsFormValues>[] {
  const { types, defaults, prefixDefaults } = input;
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
  return [...issuer, ...prefixes];
}
