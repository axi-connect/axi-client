"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { Lock } from "lucide-react";
import type { GovernedField, ProductDTO } from "@/modules/catalog/domain/product";
import { updateProduct } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { EffectiveCategoryField } from "./EffectiveCategoryField";
import { ProductThumb } from "./ProductThumb";
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
import type { AppAlert } from "@/core/notifications";

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
  onDirtyChange,
  locked,
}: {
  product: ProductDTO;
  /** `catalog:manage`. En un espejo, la ficha no se edita pero la categoría efectiva sí (F5). */
  canManage: boolean;
  /**
   * Catálogo premium F5: los campos que manda la tienda conectada
   * (`locked_fields`). En un producto espejado el servidor rechaza cualquier
   * PATCH de la ficha, así que la ficha queda de lectura, pero cada campo dice
   * si lo manda la tienda y la categoría efectiva se puede fijar.
   */
  locked?: ReadonlySet<GovernedField>;
  onSaved: (updated: ProductDTO) => void;
  setAlert?: (alert: AppAlert) => void;
  /** Catálogo premium F3: la ficha avisa antes de salir con cambios sin guardar. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { productTypes } = useCatalog();
  const governed = (locked?.size ?? 0) > 0;
  const editable = canManage && !governed;
  const lockHint = (field: GovernedField) =>
    locked?.has(field) ? (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock aria-hidden="true" className="size-3" />
        Lo manda Shopify
      </p>
    ) : null;
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

  const currency = form.watch("currency");
  const imageUrl = form.watch("image_url");
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = async (values: ProductBaseFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const updated = await updateProduct(product.id, toUpdateProductDTO(values));
      setAlert?.({ tone: "success", title: "Producto actualizado correctamente" });
      onSaved(updated);
    } catch (err) {
      if (applyServerValidation(err, form)) return;
      setAlert?.({ tone: "error", title: errorMessage(err, "No se pudo actualizar el producto") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="informacion" className="scroll-mt-24 space-y-4" aria-label="Información del producto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold">Información</h2>
            {editable && (
              <Button type="submit" size="sm" className="rounded-full px-4" disabled={submitting || !isDirty}>
                {submitting ? "Guardando…" : "Guardar cambios"}
              </Button>
            )}
          </div>

          {governed ? (
            <p className="text-xs text-pretty text-muted-foreground">
              Un producto de tu tienda se edita allá. Aquí puedes fijar su categoría y ajustar su búsqueda con IA.
            </p>
          ) : null}
          <fieldset disabled={!editable} className="space-y-4">
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
                    {lockHint("name")}
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
                      {/* Misma vista previa que al crear (inventario B §3.6). */}
                      <ProductThumb
                        src={imageUrl || null}
                        alt="Vista previa de la imagen"
                        kind={product.kind}
                        className="h-9 w-9 shrink-0 rounded-lg"
                      />
                    </div>
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
                    <Textarea
                      rows={3}
                      maxLength={2000}
                      placeholder="Describe el producto: la IA la usa para recomendarlo (opcional)"
                      {...field}
                    />
                  </FormControl>
                  {lockHint("description")}
                  <FormMessage />
                </FormItem>
              )}
            />

          </fieldset>

          {/* La categoría efectiva guarda al instante (no con «Guardar cambios») y va en su propia fila,
              FUERA del fieldset: en un espejo se puede fijar (el servidor escribe la clasificación, no el
              campo de la tienda). */}
          <EffectiveCategoryField product={product} canManage={canManage} onSaved={onSaved} setAlert={setAlert} />

          <fieldset disabled={!editable} className="space-y-4">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                        disabled={!editable}
                        aria-invalid={Boolean(fieldState.error)}
                      />
                    </FormControl>
                    {lockHint("price")}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                          placeholder="10"
                          className="tabular-nums"
                          value={field.value === undefined ? "" : String(field.value)}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
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
