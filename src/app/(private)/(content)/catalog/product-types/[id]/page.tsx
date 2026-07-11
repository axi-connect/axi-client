"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { FormSkeleton } from "@/shared/components/features/loading";
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert";
import type { ProductTypeDTO } from "@/modules/catalog/domain/product-type";
import { getProductTypeById } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { AttributeSetEditor } from "@/modules/catalog/ui/components/AttributeSetEditor";
import { ProductTypeForm } from "@/modules/catalog/ui/forms/ProductTypeForm";

/** Detalle de tipo de producto: datos base + editor del attribute set. */
export default function ProductTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const { fetchProductTypes } = useCatalog();
  const canManage = hasPermission("catalog:manage");

  const [productType, setProductType] = useState<ProductTypeDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);

  const setAlert = (cfg: FloatingAlertConfig) => {
    setAlertConfig(cfg);
    setAlertOpen(true);
  };

  const load = useCallback(async () => {
    try {
      setProductType(await getProductTypeById(id));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "No se pudo cargar el tipo de producto"));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/catalog/product-types"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tipos de producto
        </Link>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          {productType?.name ?? "Tipo de producto"}
        </h2>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
          {loadError}
        </div>
      ) : !productType ? (
        <FormSkeleton fields={4} showHeader={false} />
      ) : (
        <>
          <div className="max-w-2xl rounded-2xl border border-border bg-background p-4 md:p-6">
            <ProductTypeForm
              productTypeId={productType.id}
              defaultValues={{
                name: productType.name,
                description: productType.description ?? "",
              }}
              setAlert={setAlert}
              onSaved={async (saved) => {
                setProductType(saved);
                await fetchProductTypes();
              }}
            />
          </div>

          <AttributeSetEditor
            productType={productType}
            readOnly={!canManage}
            setAlert={setAlert}
            onSaved={async (updated) => {
              setProductType(updated);
              await fetchProductTypes();
            }}
          />
        </>
      )}

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
