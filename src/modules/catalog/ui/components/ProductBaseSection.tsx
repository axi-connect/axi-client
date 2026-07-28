"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { flattenCategoryTree } from "@/modules/catalog/domain/category";
import type { ProductDTO } from "@/modules/catalog/domain/product";
import { updateProduct } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { PriceInput } from "./PriceInput";
import {
  NONE_VALUE,
  productBaseFormSchema,
  productToBaseFormValues,
  SUPPORTED_CURRENCIES,
  toUpdateProductDTO,
  type ProductBaseFormValues,
} from "@/modules/catalog/ui/forms/config/product.config";
import {
  Form,
  FormControl,
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

/**
 * Sección "Información" del detalle: ficha base editable con guardado
 * independiente (`PATCH /catalog/products/:id`). No permite mover de
 * catálogo (restricción del backend) ni cambiar el kind.
 */
export function ProductBaseSection({
  product,
  canManage,
  onSaved,
  setAlert,
}: {
  product: ProductDTO;
  canManage: boolean;
  onSaved: (updated: ProductDTO) => void;
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void;
}) {
  const { categoryTree, productTypes } = useCatalog();
  const [submitting, setSubmitting] = useState(false);
  const isService = product.kind === "service";

  const form = useForm<ProductBaseFormValues>({
    resolver: zodResolver(productBaseFormSchema),
    defaultValues: productToBaseFormValues(product),
  });

  // Re-sincroniza tras re-fetch del producto (variantes/atributos guardados).
  useEffect(() => {
    form.reset(productToBaseFormValues(product));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const categoryOptions = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const currency = form.watch("currency");
  const isDirty = form.formState.isDirty;

  const handleSubmit = async (values: ProductBaseFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const updated = await updateProduct(product.id, toUpdateProductDTO(values));
      setAlert?.({ variant: "success", title: "Producto actualizado correctamente" });
      onSaved(updated);
    } catch (err) {
      if (applyServerValidation(err, form)) return;
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo actualizar el producto") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4" aria-label="Información del producto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Información</h3>
            {canManage && (
              <Button type="submit" disabled={submitting || !isDirty}>
                {submitting ? "Guardando…" : "Guardar cambios"}
              </Button>
            )}
          </div>
          <Separator />

          <fieldset disabled={!canManage} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input maxLength={200} {...field} />
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
                    <FormControl>
                      <Input type="url" placeholder="https://…/producto.png" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      La descargaremos y la serviremos desde axi para que siempre cargue rápido
                    </p>
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
                    <Textarea rows={3} maxLength={2000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        disabled={!canManage}
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

            {isService && (
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
                          className="tabular-nums"
                          value={field.value === undefined ? "" : String(field.value)}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
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
                          className="tabular-nums"
                          value={field.value === undefined ? "" : String(field.value)}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
                        />
                      </FormControl>
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
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label="Requiere reserva"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </fieldset>
        </form>
      </Form>
    </section>
  );
}
