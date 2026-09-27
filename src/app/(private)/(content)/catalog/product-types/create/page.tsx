"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { ProductTypeForm } from "@/modules/catalog/ui/forms/ProductTypeForm";

/**
 * Nuevo tipo de producto (catálogo premium F4). El POST no acepta atributos:
 * al crear se va al detalle, donde se definen. Sin `catalog:manage` no se pinta
 * el formulario (antes solo se ocultaba el botón que traía aquí, D.1 #12).
 */
export default function CreateProductTypePage() {
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const { fetchProductTypes } = useCatalog();
  const canManage = hasPermission("catalog:manage");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Link
        href="/catalog/product-types"
        className="inline-flex min-h-6 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Tipos de producto
      </Link>

      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Catálogo · nuevo</p>
        <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight sm:text-[2.5rem]">
          Nuevo tipo de producto
        </h1>
        <p className="text-sm text-muted-foreground">Primero el nombre; después podrás definir sus atributos.</p>
      </header>

      {canManage ? (
        <section aria-label="Datos del tipo" className="max-w-3xl rounded-3xl border border-border bg-card p-5">
          <ProductTypeForm
            setAlert={showAlert}
            onSaved={async (created) => {
              await fetchProductTypes();
              router.replace(`/catalog/product-types/${created.id}`);
            }}
          />
        </section>
      ) : (
        <Alert className="max-w-2xl rounded-2xl">
          <Eye aria-hidden="true" />
          <AlertTitle>Puedes ver el catálogo, pero no cambiarlo</AlertTitle>
          <AlertDescription>
            Para crear tipos de producto pide a un administrador el permiso para gestionar el catálogo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
