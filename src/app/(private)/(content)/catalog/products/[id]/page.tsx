"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Lock, Store } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { productReadiness } from "@/modules/catalog/domain/product-readiness";
import { governedFieldLabels } from "@/modules/catalog/domain/product";
import type { ProductDTO, StockDTO } from "@/modules/catalog/domain/product";
import type { ProductTypeDTO } from "@/modules/catalog/domain/product-type";
import {
  deleteProduct,
  getProductById,
  updateProduct,
} from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { getProductTypeById } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { ProductAttributesSection } from "@/modules/catalog/ui/components/ProductAttributesSection";
import { ProductBaseSection } from "@/modules/catalog/ui/components/ProductBaseSection";
import { ProductDetailHeader } from "@/modules/catalog/ui/components/ProductDetailHeader";
import { ProductDetailSkeleton } from "@/modules/catalog/ui/components/ProductDetailSkeleton";
import { ProductEnrichmentSection } from "@/modules/catalog/ui/components/ProductEnrichmentSection";
import { ProductPhotosSection } from "@/modules/catalog/ui/components/ProductPhotosSection";
import { ProductReadinessIsland } from "@/modules/catalog/ui/components/ProductReadinessIsland";
import { useUnsavedGuard } from "@/core/hooks/use-unsaved-guard";
import { VariantsTable } from "@/modules/catalog/ui/components/VariantsTable";

const CARD = "rounded-3xl border border-border bg-card p-5";

/**
 * La ficha de un producto (catálogo premium F3, canvas tableros 4 y 5): la
 * cabecera con el `h1`, a la izquierda Información, Atributos y Variantes; a
 * la derecha la isla «Para que tu agente lo venda» y las Fotos; debajo, la
 * búsqueda con IA. Cada sección guarda por su cuenta (el backend fragmenta la
 * edición en endpoints separados) y avisa si quedó a medias
 * (`useUnsavedGuard`). Paridad: `docs/plans/catalog_premium_f3_paridad.md`.
 */
export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { catalogs } = useCatalog();
  const guard = useUnsavedGuard();
  const canManage = hasPermission("catalog:manage");
  const canAdjustStock = hasPermission("catalog:stock");
  const highlightRequired = searchParams.get("pending_attributes") === "1";

  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [productType, setProductType] = useState<ProductTypeDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { showAlert } = useAlert();

  const load = useCallback(async () => {
    try {
      const fetched = await getProductById(id);
      setProduct(fetched);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "No se pudo cargar el producto"));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // El attribute set del tipo (necesario para atributos y ejes de variante).
  useEffect(() => {
    let cancelled = false;
    if (!product?.product_type_id) {
      setProductType(null);
      return;
    }
    (async () => {
      try {
        const fetched = await getProductTypeById(product.product_type_id as string);
        if (!cancelled) setProductType(fetched);
      } catch {
        if (!cancelled) setProductType(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product?.product_type_id]);

  const catalogName = useMemo(
    () => catalogs.find((catalog) => catalog.id === product?.catalog_id)?.name ?? null,
    [catalogs, product?.catalog_id],
  );
  // La cabecera dice la categoría EFECTIVA, la misma que Información (D.1 #18).
  const categoryName = product?.effective_category?.name ?? null;
  const readiness = useMemo(() => (product ? productReadiness(product, productType) : null), [product, productType]);
  const lockedLabels = useMemo(() => governedFieldLabels(product?.locked_fields ?? []), [product?.locked_fields]);

  const variantAxes = useMemo(
    () => productType?.attributes.filter((attribute) => attribute.scope === "variant") ?? [],
    [productType],
  );

  // F17: producto espejado de una integración — los campos gobernados se
  // muestran como valores de lectura (ocultar, no deshabilitar) y la fuente es
  // `locked_fields`, que lo sirve el BACKEND (regla 4 del contrato: derivarlo
  // aquí significaría que un cambio de política desbloquea campos en silencio).
  const locked = useMemo(() => new Set(product?.locked_fields ?? []), [product?.locked_fields]);
  const governed = product?.governed_by_connection_id != null;

  const handleToggleActive = async () => {
    if (!product || toggling) return;
    try {
      setToggling(true);
      const updated = await updateProduct(product.id, { is_active: !product.is_active });
      setProduct(updated);
      showAlert({
        tone: "success",
        title: updated.is_active ? "Producto activado" : "Producto desactivado",
      });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo cambiar el estado") });
    } finally {
      setToggling(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!product || deleting) return;
    try {
      setDeleting(true);
      await deleteProduct(product.id);
      showAlert({ tone: "success", title: "Producto eliminado" });
      router.replace("/catalog/products");
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el producto") });
      setDeleting(false);
    }
  };

  /** Ajuste de stock: la respuesta trae `{on_hand, threshold}` → patch local. */
  const handleStockAdjusted = (variantId: string, stock: StockDTO) => {
    setProduct((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variants: prev.variants.map((variant) =>
          variant.id === variantId
            ? {
                ...variant,
                stock: {
                  on_hand: stock.on_hand,
                  out_of_stock_threshold: stock.out_of_stock_threshold,
                  available: stock.on_hand > stock.out_of_stock_threshold,
                },
              }
            : variant,
        ),
      };
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Link
        href="/catalog/products"
        onClick={(event) => {
          // Con cambios sin guardar se pregunta antes de salir.
          if (!guard.dirty) return;
          event.preventDefault();
          guard.leave("/catalog/products");
        }}
        className="inline-flex min-h-6 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Productos
      </Link>

      {loadError ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>No pudimos abrir este producto</AlertTitle>
          <AlertDescription>
            <p>{loadError}</p>
            <Button variant="outline" size="sm" className="mt-2 rounded-full px-4 text-foreground" onClick={() => void load()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : !product || !readiness ? (
        <ProductDetailSkeleton />
      ) : (
        <>
          <ProductDetailHeader
            product={product}
            catalogName={catalogName}
            categoryName={categoryName}
            // `status` gobernado: activar/desactivar/eliminar lo decide el sync
            canManage={canManage && !locked.has("status")}
            statusLocked={canManage && locked.has("status")}
            toggling={toggling}
            onToggleActive={() => void handleToggleActive()}
            onDelete={() => setDeleteOpen(true)}
          />

          {governed && (
            <Alert variant="info" className="rounded-2xl">
              <Store aria-hidden="true" />
              <AlertDescription>
                <p>
                  <span className="font-medium text-foreground">Este producto lo gobierna tu tienda conectada.</span>{" "}
                  Nombre, precio, stock e imágenes se actualizan solos desde Shopify; editarlos allá es la forma de
                  cambiarlos aquí. La conexión se administra en{" "}
                  <Link href="/settings/integrations" className="inline-block py-0.5 text-foreground underline underline-offset-2">
                    Integraciones
                  </Link>
                  .
                </p>
                {/* Catálogo premium F5: lo que manda la tienda, uno por uno (`locked_fields` del backend). */}
                <ul aria-label="Lo manda Shopify" className="mt-2 flex flex-wrap gap-1.5">
                  {lockedLabels.map((label) => (
                    <li key={label} className="inline-flex h-6 items-center gap-1 rounded-full bg-background/70 px-2.5 text-xs font-medium text-foreground">
                      <Lock aria-hidden="true" className="size-3" />
                      {label}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">Aquí sí puedes fijar su categoría y ajustar su búsqueda con IA.</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
            {/* Derecha en escritorio; primero en el celular (canvas tablero 5). */}
            <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
              <ProductReadinessIsland readiness={readiness} canManage={canManage} />
              <div className={CARD}>
                <ProductPhotosSection
                  product={product}
                  canManage={canManage && !locked.has("images")}
                  lockedByStore={locked.has("images")}
                  onSaved={setProduct}
                  setAlert={showAlert}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
              <div className={CARD}>
                <ProductBaseSection
                  product={product}
                  // F5: en un espejo la ficha es de lectura (el servidor rechaza el PATCH) y cada campo
                  // dice si lo manda la tienda; la categoría efectiva sí se fija.
                  canManage={canManage}
                  locked={governed ? locked : undefined}
                  onSaved={setProduct}
                  setAlert={showAlert}
                  onDirtyChange={guard.track("base")}
                />
              </div>

              {productType && (
                <div className={CARD}>
                  <ProductAttributesSection
                    product={product}
                    productType={productType}
                    canManage={canManage && !governed}
                    highlightRequired={highlightRequired}
                    onSaved={setProduct}
                    setAlert={showAlert}
                    onDirtyChange={guard.track("attributes")}
                  />
                </div>
              )}

              <div className={CARD}>
                <VariantsTable
                  product={product}
                  axes={variantAxes}
                  canManage={canManage && !locked.has("variants")}
                  // El popover de ajuste queda OCULTO para espejados en vez de
                  // fallar con 409: el stock lo dicta la tienda
                  canAdjustStock={canAdjustStock && !locked.has("stock")}
                  lockNote={
                    locked.has("variants") && locked.has("stock")
                      ? "Las variantes y el stock los manda Shopify"
                      : locked.has("variants")
                        ? "Las variantes las manda Shopify"
                        : locked.has("stock")
                          ? "El stock lo manda Shopify"
                          : undefined
                  }
                  onRefetch={load}
                  onStockAdjusted={handleStockAdjusted}
                  setAlert={showAlert}
                />
              </div>
            </div>
          </div>

          {/* Metadatos con IA: lo generado es de axi y se edita también en un
              espejado; solo «Aplicar categoría» respeta el gobierno del sync */}
          <ProductEnrichmentSection
            product={product}
            canManage={canManage}
            canApplyCategory={canManage && !locked.has("category")}
            onCategoryApplied={load}
            setAlert={showAlert}
            onDirtyChange={guard.track("enrichment")}
          />
        </>
      )}

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        config={{
          title: "Eliminar producto",
          description: `¿Seguro que deseas eliminar “${product?.name ?? ""}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "product-detail-delete-cancel" },
            {
              label: deleting ? "Eliminando…" : "Eliminar",
              variant: "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "product-detail-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          El producto dejará de aparecer en el catálogo y para la IA.
        </div>
      </Modal>

    </div>
  );
}

