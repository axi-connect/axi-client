"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/core/lib/utils";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { flattenCategoryTree } from "@/modules/catalog/domain/category";
import { PRODUCT_KIND_LABELS, type ProductDTO, type ProductKind } from "@/modules/catalog/domain/product";
import { createProduct } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { PriceInput } from "@/modules/catalog/ui/components/PriceInput";
import { ProductThumb } from "@/modules/catalog/ui/components/ProductThumb";
import { VariantRowsEditor } from "@/modules/catalog/ui/components/VariantRowsEditor";
import {
  defaultProductFormValues,
  NONE_VALUE,
  productFormSchema,
  SUPPORTED_CURRENCIES,
  toCreateProductDTO,
  type ProductFormValues,
} from "./config/product.config";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/** Toggle segmentado de dos opciones (kind, modo de variantes). */
function SegmentedControl<TValue extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: TValue;
  onChange: (value: TValue) => void;
  options: Array<{ value: TValue; label: string; description?: string }>;
  ariaLabel: string;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border p-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm transition-colors",
            value === option.value
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      <Separator className="mt-3" />
    </div>
  );
}

export type ProductFormProps = {
  onCreated: (product: ProductDTO, opts: { pendingRequiredAttributes: boolean }) => void | Promise<void>;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
};

/**
 * Creación de producto: un solo POST atómico (datos base + clasificación +
 * precio + agendamiento condicional + `default_sku` XOR `variants[]`).
 * Los atributos ámbito producto se completan después, en el detalle.
 */
export function ProductForm({ onCreated, setAlert }: ProductFormProps) {
  const { catalogs, categoryTree, productTypes } = useCatalog();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
  });

  const kind = form.watch("kind");
  const variantMode = form.watch("variant_mode");
  const imageUrl = form.watch("image_url");
  const currency = form.watch("currency");
  const productTypeId = form.watch("product_type_id");

  const isService = kind === "service";
  const categoryOptions = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const selectedType = useMemo(
    () => productTypes.find((type) => type.id === productTypeId),
    [productTypes, productTypeId],
  );
  const variantAxes = useMemo(
    () => selectedType?.attributes.filter((attribute) => attribute.scope === "variant") ?? [],
    [selectedType],
  );

  const handleSubmit = async (values: ProductFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await createProduct(toCreateProductDTO(values));
      const pendingRequiredAttributes = Boolean(
        selectedType?.attributes.some((attribute) => attribute.scope === "product" && attribute.is_required),
      );
      await onCreated(created, { pendingRequiredAttributes });
    } catch (err) {
      if (applyServerValidation(err, form)) return;
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo crear el producto") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form id="product-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* ── Datos básicos ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <SectionHeader title="Datos básicos" />
          <FormField
            name="kind"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qué vas a ofrecer</FormLabel>
                <FormControl>
                  <SegmentedControl<ProductKind>
                    value={field.value}
                    onChange={field.onChange}
                    ariaLabel="Tipo de producto"
                    options={[
                      { value: "product", label: PRODUCT_KIND_LABELS.product },
                      { value: "service", label: PRODUCT_KIND_LABELS.service },
                    ]}
                  />
                </FormControl>
                <FormDescription>
                  {isService
                    ? "Un servicio agendable: define duración y reserva."
                    : "Un producto físico: maneja variantes y stock."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder={isService ? "Corte de cabello" : "Camiseta básica"} maxLength={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="image_url"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen (URL)</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="url" placeholder="https://…/producto.png" {...field} />
                    </FormControl>
                    <ProductThumb
                      src={imageUrl || null}
                      alt="Vista previa de la imagen"
                      kind={kind}
                      className="h-9 w-9 shrink-0 rounded-lg"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            name="description"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    maxLength={2000}
                    placeholder="Describe el producto: la IA la usa para recomendarlo (opcional)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* ── Clasificación ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <SectionHeader title="Clasificación" subtitle="Dónde vive y cómo se tipa este producto." />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              name="catalog_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catálogo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona catálogo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {catalogs.map((catalog) => (
                        <SelectItem key={catalog.id} value={catalog.id}>
                          {catalog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="category_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select value={field.value ?? NONE_VALUE} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin categoría</SelectItem>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {`${"— ".repeat(option.depth)}${option.label}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="product_type_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de producto</FormLabel>
                  <Select value={field.value ?? NONE_VALUE} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sin tipo</SelectItem>
                      {productTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {variantAxes.length > 0 && (
                    <FormDescription>
                      Ejes de variante: {variantAxes.map((axis) => axis.label).join(", ")}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* ── Precio ────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <SectionHeader title="Precio" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              name="price_cents"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Precio base</FormLabel>
                  <FormControl>
                    <PriceInput
                      value={field.value}
                      currency={currency}
                      onChange={field.onChange}
                      aria-invalid={Boolean(fieldState.error)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="currency"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* ── Agendamiento (solo servicios) ─────────────────────────── */}
        {isService && (
          <section className="space-y-4">
            <SectionHeader title="Agendamiento" subtitle="Cómo se reserva este servicio." />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                name="duration_minutes"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        placeholder="45"
                        className="tabular-nums"
                        value={field.value === undefined ? "" : String(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="buffer_minutes"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={240}
                        step={5}
                        placeholder="10"
                        className="tabular-nums"
                        value={field.value === undefined ? "" : String(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Margen entre citas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="requires_booking"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requiere reserva</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center">
                        <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Requiere reserva" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>
        )}

        {/* ── Variantes ─────────────────────────────────────────────── */}
        <section className="space-y-4">
          <SectionHeader
            title="Variantes"
            subtitle="Todo producto nace con al menos una variante (su SKU)."
          />
          <FormField
            name="variant_mode"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <SegmentedControl<ProductFormValues["variant_mode"]>
                    value={field.value}
                    onChange={field.onChange}
                    ariaLabel="Modo de variantes"
                    options={[
                      { value: "simple", label: isService ? "Servicio simple" : "Producto simple" },
                      { value: "variants", label: "Con variantes" },
                    ]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {variantMode === "simple" ? (
            <FormField
              name="default_sku"
              control={form.control}
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="CAM-001" maxLength={64} className="font-mono" {...field} />
                  </FormControl>
                  <FormDescription>Identificador único de venta</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              name="variants"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <VariantRowsEditor
                      value={field.value}
                      onChange={field.onChange}
                      axes={variantAxes}
                      isService={isService}
                      currency={currency}
                      errors={form.formState.errors.variants}
                    />
                  </FormControl>
                  {fieldState.error?.message && <FormMessage>{fieldState.error.message}</FormMessage>}
                </FormItem>
              )}
            />
          )}
        </section>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creando…" : "Crear producto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
