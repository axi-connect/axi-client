"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { FormStep } from "@/shared/components/features/form-steps";
import { Island } from "@/shared/components/features/island";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { flattenCategoryTree } from "@/modules/catalog/domain/category";
import { PRODUCT_KIND_LABELS, type ProductDTO, type ProductKind } from "@/modules/catalog/domain/product";
import { createProduct } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { photoUploadQueue } from "@/modules/catalog/infrastructure/stores/photo-upload-queue";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { PriceInput } from "@/modules/catalog/ui/components/PriceInput";
import { DraftPhotosField, type DraftPhoto } from "@/modules/catalog/ui/components/photos/DraftPhotosField";
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
import type { AppAlert } from "@/core/notifications";

type StepKey = "kind" | "basic" | "photos" | "class" | "price" | "schedule" | "variants";

/** Campos del formulario → el paso que los contiene (para abrir el que tenga errores al enviar). */
const STEP_OF_FIELD: Record<string, StepKey> = {
  kind: "kind",
  name: "basic",
  description: "basic",
  catalog_id: "class",
  category_id: "class",
  product_type_id: "class",
  price_cents: "price",
  currency: "price",
  duration_minutes: "schedule",
  buffer_minutes: "schedule",
  requires_booking: "schedule",
  variant_mode: "variants",
  default_sku: "variants",
  variants: "variants",
};

/** «a, b y c» */
function joinWithY(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

type Check = { key: string; state: "done" | "pending" | "error" | "note"; text: string };

/** «Antes de crear» (DS §9.7): lo listo, lo que falta y lo que pasará después, a la vista. */
function BeforeCreate({ checks }: { checks: Check[] }) {
  return (
    <aside aria-label="Antes de crear" className="rounded-3xl border border-border bg-card p-5 xl:sticky xl:top-4">
      <h2 className="text-sm font-semibold">Antes de crear</h2>
      <ul className="mt-2 divide-y divide-border text-[13px]">
        {checks.map((check) => (
          <li key={check.key} className="flex items-start gap-2.5 py-2.5">
            {check.state === "done" ? (
              <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
            ) : (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-1 mt-1.5 size-1.5 shrink-0 rounded-full",
                  check.state === "error" ? "bg-destructive" : check.state === "pending" ? "bg-warning" : "bg-muted-foreground/50",
                )}
              />
            )}
            <span className={cn("text-pretty", check.state === "note" ? "text-muted-foreground" : "text-foreground")}>
              {check.state === "pending" ? <span className="sr-only">Falta: </span> : null}
              {check.state === "error" ? <span className="sr-only">Por corregir: </span> : null}
              {check.text}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export type ProductFormProps = {
  onCreated: (product: ProductDTO, opts: { pendingRequiredAttributes: boolean }) => void | Promise<void>;
  setAlert?: (alert: AppAlert) => void;
  /** Catálogo premium F3: la vista avisa antes de salir con el formulario a medias. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Cancelar: por omisión vuelve atrás en el historial, como siempre. */
  onCancel?: () => void;
};

/**
 * Creación de producto: un solo POST atómico (datos base + clasificación +
 * precio + agendamiento condicional + `default_sku` XOR `variants[]`).
 * Los atributos ámbito producto se completan después, en el detalle.
 *
 * Fotos (plan catalog_images_gallery): se eligen del dispositivo —ya no hay
 * campo URL— y, creado el producto, la cola de subida las reduce y sube con
 * la principal marcada. La cola sigue en la ficha, adonde se navega enseguida.
 */
export function ProductForm({ onCreated, setAlert, onDirtyChange, onCancel }: ProductFormProps) {
  const { catalogs, categoryTree, productTypes } = useCatalog();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [principalPhotoId, setPrincipalPhotoId] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
  });

  const kind = form.watch("kind");
  const variantMode = form.watch("variant_mode");
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

  // Pasos: todos abiertos al llegar; el dueño pliega los que ya revisó.
  const [closed, setClosed] = useState<ReadonlySet<StepKey>>(new Set());
  const isOpen = (key: StepKey) => !closed.has(key);
  const toggle = (key: StepKey) =>
    setClosed((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  /** Al enviar con errores, se abren los pasos que los tienen (un campo inválido nunca queda oculto). */
  const openStepsWithErrors = (errors: Record<string, unknown>) => {
    const withErrors = new Set(Object.keys(errors).map((field) => STEP_OF_FIELD[field]).filter(Boolean));
    setClosed((previous) => new Set([...previous].filter((key) => !withErrors.has(key))));
  };

  const isDirty = form.formState.isDirty || photos.length > 0;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const [name, catalogId, categoryId, priceCents, description, durationMinutes, defaultSku, variants] = form.watch([
    "name",
    "catalog_id",
    "category_id",
    "price_cents",
    "description",
    "duration_minutes",
    "default_sku",
    "variants",
  ]);
  const sku = (defaultSku ?? "").trim();
  const descriptionText = (description ?? "").trim();
  const nameFilled = name.trim().length > 0;
  const catalogFilled = catalogId !== "";
  const priceFilled = priceCents !== null && priceCents !== undefined;
  const durationFilled = durationMinutes !== undefined;
  const variantsFilled = variantMode === "simple" ? sku.length > 0 : variants.length > 0;
  const catalogName = catalogs.find((catalog) => catalog.id === catalogId)?.name;
  const categoryName = categoryOptions.find((option) => option.id === categoryId)?.label;

  const kindSummary = isService ? "Servicio · se agenda con duración y reserva" : "Producto · maneja variantes y stock";
  const basicSummary = nameFilled
    ? [name.trim(), descriptionText ? "con descripción" : "sin descripción"].join(" · ")
    : "Falta el nombre";
  const principalPhoto = photos.find((photo) => photo.id === principalPhotoId) ?? null;
  const photosSummary =
    photos.length === 0
      ? "Sin fotos: tu agente solo podrá describirlo"
      : `${photos.length} ${photos.length === 1 ? "foto" : "fotos"} · principal: «${principalPhoto?.file.name ?? ""}»`;
  const classSummary = catalogName
    ? [catalogName, categoryName ?? "sin categoría: la clasificación propone una", selectedType?.name].filter(Boolean).join(" · ")
    : "Falta el catálogo";
  const priceSummary = priceFilled ? `${formatMoney(priceCents, currency)} ${currency}` : "Falta el precio base";
  const scheduleSummary = durationFilled ? `${durationMinutes} min` : "Falta la duración";
  const variantsSummary =
    variantMode === "simple"
      ? sku
        ? `${isService ? "Servicio" : "Producto"} simple · ${sku}`
        : "Falta el SKU"
      : `${variants.length} ${variants.length === 1 ? "variante" : "variantes"}`;

  const errors = form.formState.errors;
  const requiredAttributes =
    selectedType?.attributes.filter((attribute) => attribute.scope === "product" && attribute.is_required) ?? [];
  const checks: Check[] = [
    {
      key: "basics",
      state: nameFilled && catalogFilled && priceFilled ? "done" : "pending",
      text:
        nameFilled && catalogFilled && priceFilled
          ? "Nombre, catálogo y precio"
          : `Falta ${joinWithY([!nameFilled && "el nombre", !catalogFilled && "el catálogo", !priceFilled && "el precio"].filter((part): part is string => Boolean(part)))}`,
    },
    ...(isService
      ? [{ key: "duration", state: durationFilled ? "done" : "pending", text: durationFilled ? "Duración del servicio" : "Falta la duración del servicio" } as Check]
      : []),
    {
      key: "variants",
      state: errors.variants || errors.default_sku ? "error" : variantsFilled ? "done" : "pending",
      text:
        errors.variants || errors.default_sku
          ? "Hay que corregir las variantes"
          : variantMode === "simple"
            ? variantsFilled
              ? "SKU de la variante por defecto"
              : "Falta el SKU"
            : variantsFilled
              ? `${variants.length} ${variants.length === 1 ? "variante" : "variantes"}`
              : "Añade al menos una variante",
    },
    ...(requiredAttributes.length > 0
      ? [
          {
            key: "attributes",
            state: "note",
            text: `Al crear te pediremos ${requiredAttributes.map((attribute) => attribute.label.toLowerCase()).join(", ")}: ${requiredAttributes.length === 1 ? "es un atributo requerido" : "son atributos requeridos"} de ${selectedType?.name}`,
          } as Check,
        ]
      : []),
    photos.length > 0
      ? {
          key: "photos",
          state: "done",
          text: `${photos.length} ${photos.length === 1 ? "foto" : "fotos"}, con «${principalPhoto?.file.name ?? ""}» como principal`,
        }
      : { key: "photos", state: "note", text: "Sin fotos tu agente no podrá mostrar este producto." },
    ...(photos.length > 0
      ? [{ key: "photos-upload", state: "note", text: "Las fotos se suben al crear. Puedes seguir en la ficha mientras terminan." } as Check]
      : []),
  ];
  const hasErrors = Object.keys(errors).length > 0;
  const dockMessage = hasErrors
    ? "Revisa los campos marcados para crear"
    : checks.some((check) => check.state === "pending")
      ? "Completa lo que falta para crear"
      : "Listo para crear";

  const handleSubmit = async (values: ProductFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await createProduct(toCreateProductDTO(values));
      if (photos.length > 0) {
        const index = photos.findIndex((photo) => photo.id === principalPhotoId);
        photoUploadQueue.enqueue({
          product_id: created.id,
          files: photos.map((photo) => photo.file),
          primary_index: index >= 0 ? index : 0,
        });
      }
      const pendingRequiredAttributes = Boolean(
        selectedType?.attributes.some((attribute) => attribute.scope === "product" && attribute.is_required),
      );
      await onCreated(created, { pendingRequiredAttributes });
    } catch (err) {
      if (applyServerValidation(err, form)) return;
      setAlert?.({ tone: "error", title: errorMessage(err, "No se pudo crear el producto") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form id="product-form" onSubmit={form.handleSubmit(handleSubmit, openStepsWithErrors)} className="flex flex-col gap-6">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] [&>*]:min-w-0">
          <div className="flex flex-col gap-3">
            <FormStep number={1} title="Qué vas a ofrecer" summary={kindSummary} state="done" open={isOpen("kind")} onToggle={() => toggle("kind")}>
              <FormField
                name="kind"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    {/* El paso ya lo titula: la etiqueta queda para el lector de pantalla. */}
                <FormLabel className="sr-only">Qué vas a ofrecer</FormLabel>
                    <FormControl>
                      <SegmentedControl<ProductKind>
                        value={field.value}
                        onValueChange={field.onChange}
                        label="Tipo de producto"
                        surface="inline"
                        items={[
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

            </FormStep>

            <FormStep number={2} title="Datos básicos" summary={basicSummary} state={nameFilled ? "done" : "pending"} open={isOpen("basic")} onToggle={() => toggle("basic")}>
              <div>
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
            </FormStep>

            <FormStep
              number={3}
              title="Fotos"
              subtitle="Las que tu agente envía cuando un cliente pide ver el producto."
              summary={photosSummary}
              state={photos.length > 0 ? "done" : "pending"}
              open={isOpen("photos")}
              onToggle={() => toggle("photos")}
            >
              <DraftPhotosField
                photos={photos}
                principalId={principalPhotoId}
                onChange={(next, principal) => {
                  setPhotos(next);
                  setPrincipalPhotoId(principal);
                }}
                setAlert={setAlert}
              />
            </FormStep>

            <FormStep
              number={4}
              title="Clasificación"
              subtitle="Dónde vive y cómo se tipa este producto."
              summary={classSummary}
              state={catalogFilled ? "done" : "pending"}
              open={isOpen("class")}
              onToggle={() => toggle("class")}
            >
              {catalogs.length === 0 ? (
                // Sin catálogos no se puede crear: se dice y se ofrece el camino (D.1 #17).
                <Alert variant="warning">
                  <TriangleAlert aria-hidden="true" />
                  <AlertDescription>
                    <p>Aún no tienes catálogos. Crea uno para ubicar tus productos.</p>
                    <Button asChild variant="outline" size="sm" className="mt-2 rounded-full px-4">
                      <Link href="/catalog/catalogs">Crear catálogo</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
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
            </FormStep>

            <FormStep number={5} title="Precio" summary={priceSummary} state={priceFilled ? "done" : "pending"} open={isOpen("price")} onToggle={() => toggle("price")}>
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
            </FormStep>

            {isService && (
              <FormStep
                number={6}
                title="Agendamiento"
                subtitle="Cómo se reserva este servicio."
                summary={scheduleSummary}
                state={durationFilled ? "done" : "pending"}
                open={isOpen("schedule")}
                onToggle={() => toggle("schedule")}
              >
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
              </FormStep>
            )}

            <FormStep
              number={isService ? 7 : 6}
              title="Variantes"
              subtitle="Todo producto nace con al menos una variante (su SKU)."
              summary={variantsSummary}
              state={variantsFilled ? "done" : "pending"}
              open={isOpen("variants")}
              onToggle={() => toggle("variants")}
            >
              <FormField
                name="variant_mode"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <SegmentedControl<ProductFormValues["variant_mode"]>
                        value={field.value}
                        onValueChange={field.onChange}
                        label="Modo de variantes"
                        surface="inline"
                        items={[
                          { value: "simple", label: isService ? "Servicio simple" : "Producto simple" },
                          { value: "variants", label: "Con variantes" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Las dos ramas ocupan la MISMA posición del árbol: sin `key`, React
                  reutiliza el Controller y el editor de variantes recibe en su
                  primer render el string del SKU (`value.map is not a function`). */}
              {variantMode === "simple" ? (
                <FormField
                  key="default_sku"
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
                  key="variants"
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
            </FormStep>
          </div>

          <BeforeCreate checks={checks} />
        </div>

        {/* La barra de acción en tinta, pegada abajo (DS §9.5.1): la única superficie de marca de la vista. */}
        <Island
          as="footer"
          material="ink"
          glow="none"
          className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-3xl py-2.5 pr-2.5 pl-5 sm:rounded-full"
        >
          <p className="min-w-0 basis-full text-sm text-muted-foreground sm:flex-1 sm:basis-auto">{dockMessage}</p>
          <Button type="button" variant="ghost" className="ml-auto rounded-full sm:ml-0" onClick={() => (onCancel ? onCancel() : window.history.back())}>
            Cancelar
          </Button>
          <Button type="submit" className="rounded-full px-5" disabled={submitting}>
            {submitting ? "Creando…" : "Crear producto"}
          </Button>
        </Island>
      </form>
    </Form>
  );
}
