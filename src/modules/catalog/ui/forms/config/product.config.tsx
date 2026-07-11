"use client";

import { z } from "zod";
import type {
  CreateProductDTO,
  ProductDTO,
  UpdateProductDTO,
} from "@/modules/catalog/domain/product";

/** Sentinel para selects opcionales (categoría / tipo de producto). */
export const NONE_VALUE = "__none__";

export const SUPPORTED_CURRENCIES = ["COP", "USD", "EUR", "MXN"] as const;

export const variantRowSchema = z.object({
  sku: z.string().trim().min(1, "SKU requerido").max(64, "Máximo 64 caracteres"),
  name: z.string().trim().max(120, "Máximo 120 caracteres").optional().or(z.literal("")),
  /** null = hereda el precio base del producto. */
  price_cents: z.number().int().min(0, "Debe ser ≥ 0").nullable(),
  // Los inputs numéricos emiten undefined cuando están vacíos (no "").
  initial_stock: z.number().int("Debe ser un entero").min(0, "Debe ser ≥ 0").optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export type VariantRowValues = z.infer<typeof variantRowSchema>;

export const productFormSchema = z
  .object({
    kind: z.enum(["product", "service"]),
    name: z.string().trim().min(1, "Nombre requerido").max(200, "Máximo 200 caracteres"),
    description: z.string().trim().max(2000, "Máximo 2000 caracteres").optional().or(z.literal("")),
    image_url: z.url("URL inválida").optional().or(z.literal("")),
    catalog_id: z.string().min(1, "Selecciona el catálogo"),
    category_id: z.string().optional(),
    product_type_id: z.string().optional(),
    price_cents: z
      .number({ message: "Precio requerido" })
      .int()
      .min(0, "Debe ser ≥ 0")
      .nullable()
      .refine((value) => value !== null, "Precio requerido"),
    currency: z.string().length(3, "Código de 3 letras"),
    duration_minutes: z
      .number()
      .int("Debe ser un entero")
      .min(5, "Mínimo 5 minutos")
      .max(480, "Máximo 480 minutos")
      .optional(),
    buffer_minutes: z
      .number()
      .int("Debe ser un entero")
      .min(0, "Debe ser ≥ 0")
      .max(240, "Máximo 240 minutos")
      .optional(),
    requires_booking: z.boolean(),
    variant_mode: z.enum(["simple", "variants"]),
    default_sku: z.string().trim().max(64, "Máximo 64 caracteres").optional().or(z.literal("")),
    variants: z.array(variantRowSchema),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "service" && values.duration_minutes === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["duration_minutes"],
        message: "Un servicio requiere duración en minutos",
      });
    }
    if (values.variant_mode === "simple" && !values.default_sku) {
      ctx.addIssue({ code: "custom", path: ["default_sku"], message: "SKU requerido" });
    }
    if (values.variant_mode === "variants") {
      if (values.variants.length === 0) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: "Añade al menos una variante" });
      }
      const seen = new Set<string>();
      values.variants.forEach((variant, index) => {
        const sku = variant.sku.trim().toLowerCase();
        if (!sku) return; // ya lo reporta variantRowSchema
        if (seen.has(sku)) {
          ctx.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "SKU repetido" });
        }
        seen.add(sku);
      });
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const defaultProductFormValues: ProductFormValues = {
  kind: "product",
  name: "",
  description: "",
  image_url: "",
  catalog_id: "",
  category_id: NONE_VALUE,
  product_type_id: NONE_VALUE,
  price_cents: null,
  currency: "COP",
  duration_minutes: undefined,
  buffer_minutes: undefined,
  requires_booking: false,
  variant_mode: "simple",
  default_sku: "",
  variants: [],
};

function optionalId(value: string | undefined): string | undefined {
  return value && value !== NONE_VALUE ? value : undefined;
}

export function toCreateProductDTO(values: ProductFormValues): CreateProductDTO {
  const categoryId = optionalId(values.category_id);
  const productTypeId = optionalId(values.product_type_id);
  const isService = values.kind === "service";

  return {
    catalog_id: values.catalog_id,
    kind: values.kind,
    name: values.name,
    price_cents: values.price_cents ?? 0,
    currency: values.currency,
    ...(values.description ? { description: values.description } : {}),
    ...(values.image_url ? { image_url: values.image_url } : {}),
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(productTypeId ? { product_type_id: productTypeId } : {}),
    ...(isService
      ? {
          duration_minutes: values.duration_minutes,
          requires_booking: values.requires_booking,
          ...(values.buffer_minutes !== undefined ? { buffer_minutes: values.buffer_minutes } : {}),
        }
      : {}),
    ...(values.variant_mode === "simple"
      ? { default_sku: values.default_sku }
      : {
          variants: values.variants.map((variant) => ({
            sku: variant.sku.trim(),
            ...(variant.name ? { name: variant.name } : {}),
            ...(Object.keys(variant.attributes).length > 0 ? { attributes: variant.attributes } : {}),
            ...(variant.price_cents !== null ? { price_cents: variant.price_cents } : {}),
            ...(variant.initial_stock !== undefined ? { initial_stock: variant.initial_stock } : {}),
          })),
        }),
  };
}

/** Schema del form de edición de la ficha (sin catálogo ni variantes). */
export const productBaseFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nombre requerido").max(200, "Máximo 200 caracteres"),
    description: z.string().trim().max(2000, "Máximo 2000 caracteres").optional().or(z.literal("")),
    image_url: z.url("URL inválida").optional().or(z.literal("")),
    category_id: z.string().optional(),
    product_type_id: z.string().optional(),
    price_cents: z
      .number({ message: "Precio requerido" })
      .int()
      .min(0, "Debe ser ≥ 0")
      .nullable()
      .refine((value) => value !== null, "Precio requerido"),
    currency: z.string().length(3, "Código de 3 letras"),
    kind: z.enum(["product", "service"]),
    duration_minutes: z
      .number()
      .int("Debe ser un entero")
      .min(5, "Mínimo 5 minutos")
      .max(480, "Máximo 480 minutos")
      .optional(),
    buffer_minutes: z
      .number()
      .int("Debe ser un entero")
      .min(0, "Debe ser ≥ 0")
      .max(240, "Máximo 240 minutos")
      .optional(),
    requires_booking: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "service" && values.duration_minutes === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["duration_minutes"],
        message: "Un servicio requiere duración en minutos",
      });
    }
  });

export type ProductBaseFormValues = z.infer<typeof productBaseFormSchema>;

export function productToBaseFormValues(product: ProductDTO): ProductBaseFormValues {
  return {
    name: product.name,
    description: product.description ?? "",
    image_url: product.image_url ?? "",
    category_id: product.category_id ?? NONE_VALUE,
    product_type_id: product.product_type_id ?? NONE_VALUE,
    price_cents: product.price_cents,
    currency: product.currency,
    kind: product.kind,
    duration_minutes: product.duration_minutes ?? undefined,
    buffer_minutes: product.buffer_minutes ?? undefined,
    requires_booking: product.requires_booking,
  };
}

export function toUpdateProductDTO(values: ProductBaseFormValues): UpdateProductDTO {
  const isService = values.kind === "service";
  return {
    name: values.name,
    description: values.description || null,
    image_url: values.image_url || null,
    category_id: optionalId(values.category_id) ?? null,
    product_type_id: optionalId(values.product_type_id) ?? null,
    price_cents: values.price_cents ?? 0,
    currency: values.currency,
    ...(isService
      ? {
          duration_minutes: values.duration_minutes ?? null,
          buffer_minutes: values.buffer_minutes ?? null,
          requires_booking: values.requires_booking,
        }
      : {}),
  };
}
