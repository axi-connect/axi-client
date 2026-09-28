"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { FormSkeleton } from "@/shared/components/features/loading";
import { useAlert } from "@/core/providers/alert-provider";
import type { ProductTypeDTO } from "@/modules/catalog/domain/product-type";
import { getProductTypeById } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { AttributeSetEditor } from "@/modules/catalog/ui/components/AttributeSetEditor";
import { ProductTypeForm } from "@/modules/catalog/ui/forms/ProductTypeForm";
import { useUnsavedGuard } from "@/modules/catalog/ui/hooks/use-unsaved-guard";

/**
 * Un tipo de producto (catálogo premium F4, canvas tablero 10): sus datos y el
 * editor de atributos, que avisa con la barra de tinta cuando hay cambios. Sin
 * `catalog:manage` los datos se leen (antes el formulario base se podía enviar
 * sin permiso, inventario D.1 #12). Paridad: `docs/plans/catalog_premium_f4_paridad.md`.
 */
export default function ProductTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const { fetchProductTypes, productTypes } = useCatalog();
  const canManage = hasPermission("catalog:manage");
  const guard = useUnsavedGuard();

  const [productType, setProductType] = useState<ProductTypeDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { showAlert } = useAlert();

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

  const inUse = productTypes.find((type) => type.id === id)?.product_count ?? null;
  const attributes = productType?.attributes.length ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Link
        href="/catalog/product-types"
        onClick={(event) => {
          if (!guard.dirty) return;
          event.preventDefault();
          guard.leave("/catalog/product-types");
        }}
        className="inline-flex min-h-6 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Tipos de producto
      </Link>

      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {[
            "Tipo de producto",
            ...(inUse !== null ? [inUse === 0 ? "ningún producto lo usa" : `${inUse.toLocaleString("es-CO")} ${inUse === 1 ? "producto lo usa" : "productos lo usan"}`] : []),
            ...(productType ? [`${attributes} ${attributes === 1 ? "atributo" : "atributos"}`] : []),
          ].join(" · ")}
        </p>
        <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance break-words sm:text-[2.5rem]">
          {productType?.name ?? "Tipo de producto"}
        </h1>
      </header>

      {loadError ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>No pudimos abrir este tipo de producto</AlertTitle>
          <AlertDescription>
            <p>{loadError}</p>
            <Button variant="outline" size="sm" className="mt-2 rounded-full px-4 text-foreground" onClick={() => void load()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : !productType ? (
        <FormSkeleton fields={4} showHeader={false} />
      ) : (
        <>
          <section aria-label="Datos del tipo" className="max-w-3xl rounded-3xl border border-border bg-card p-5">
            {canManage ? (
              <ProductTypeForm
                productTypeId={productType.id}
                defaultValues={{
                  name: productType.name,
                  description: productType.description ?? "",
                }}
                setAlert={showAlert}
                onSaved={async (saved) => {
                  setProductType(saved);
                  await fetchProductTypes();
                }}
              />
            ) : (
              <dl className="grid gap-4 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{productType.name}</dd>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{productType.description || "—"}</dd>
              </dl>
            )}
          </section>

          <AttributeSetEditor
            productType={productType}
            readOnly={!canManage}
            setAlert={showAlert}
            onDirtyChange={guard.track("attributes")}
            onSaved={async (updated) => {
              setProductType(updated);
              await fetchProductTypes();
            }}
          />
        </>
      )}
    </div>
  );
}
