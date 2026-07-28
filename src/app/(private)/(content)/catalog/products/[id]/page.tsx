"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { FormSkeleton } from "@/shared/components/features/loading";
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert";
import { flattenCategoryTree } from "@/modules/catalog/domain/category";
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
import { ProductPhotosSection } from "@/modules/catalog/ui/components/ProductPhotosSection";
import { VariantsTable } from "@/modules/catalog/ui/components/VariantsTable";

/**
 * Detalle de producto: hub con secciones editables independientes
 * (información / atributos EAV / variantes+stock), porque el backend
 * fragmenta la edición en endpoints separados.
 */
export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { catalogs, categoryTree } = useCatalog();
  const canManage = hasPermission("catalog:manage");
  const canAdjustStock = hasPermission("catalog:stock");
  const highlightRequired = searchParams.get("pending_attributes") === "1";

  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [productType, setProductType] = useState<ProductTypeDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);

  const setAlert = useCallback((cfg: FloatingAlertConfig) => {
    setAlertConfig(cfg);
    setAlertOpen(true);
  }, []);

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
  const categoryName = useMemo(() => {
    if (!product?.category_id) return null;
    return (
      flattenCategoryTree(categoryTree).find((option) => option.id === product.category_id)?.label ?? null
    );
  }, [categoryTree, product?.category_id]);

  const variantAxes = useMemo(
    () => productType?.attributes.filter((attribute) => attribute.scope === "variant") ?? [],
    [productType],
  );

  const handleToggleActive = async () => {
    if (!product || toggling) return;
    try {
      setToggling(true);
      const updated = await updateProduct(product.id, { is_active: !product.is_active });
      setProduct(updated);
      setAlert({
        variant: "success",
        title: updated.is_active ? "Producto activado" : "Producto desactivado",
      });
    } catch (err) {
      setAlert({ variant: "destructive", title: errorMessage(err, "No se pudo cambiar el estado") });
    } finally {
      setToggling(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!product || deleting) return;
    try {
      setDeleting(true);
      await deleteProduct(product.id);
      router.replace("/catalog/products");
    } catch (err) {
      setAlert({ variant: "destructive", title: errorMessage(err, "No se pudo eliminar el producto") });
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
    <div className="space-y-6">
      <Link
        href="/catalog/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Productos
      </Link>

      {loadError ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : !product ? (
        <FormSkeleton fields={8} showHeader={false} />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
            <ProductDetailHeader
              product={product}
              catalogName={catalogName}
              categoryName={categoryName}
              canManage={canManage}
              toggling={toggling}
              onToggleActive={() => void handleToggleActive()}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
            <ProductBaseSection
              product={product}
              canManage={canManage}
              onSaved={setProduct}
              setAlert={setAlert}
            />
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
            <ProductPhotosSection
              product={product}
              canManage={canManage}
              onSaved={setProduct}
              setAlert={setAlert}
            />
          </div>

          {productType && (
            <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
              <ProductAttributesSection
                product={product}
                productType={productType}
                canManage={canManage}
                highlightRequired={highlightRequired}
                onSaved={setProduct}
                setAlert={setAlert}
              />
            </div>
          )}

          <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
            <VariantsTable
              product={product}
              axes={variantAxes}
              canManage={canManage}
              canAdjustStock={canAdjustStock}
              onRefetch={load}
              onStockAdjusted={handleStockAdjusted}
              setAlert={setAlert}
            />
          </div>
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
              label: deleting ? "Eliminando..." : "Eliminar",
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

      <FloatingAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        config={{
          variant: alertConfig?.variant ?? "default",
          title: alertConfig?.title ?? "",
          description: alertConfig?.description,
          durationMs: 4000,
        }}
      />
    </div>
  );
}
