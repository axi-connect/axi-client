"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { ProductForm } from "@/modules/catalog/ui/forms/ProductForm";
import { useUnsavedGuard } from "@/core/hooks/use-unsaved-guard";

/**
 * Crear producto (catálogo premium F3, canvas tablero 6): pasos plegables,
 * «Antes de crear» y la barra de acción en tinta. Tras crear se redirige al
 * detalle; si el tipo elegido tiene atributos requeridos ámbito producto, el
 * detalle los resalta. Sin `catalog:manage` no se pinta el formulario (antes
 * se mostraba y fallaba al enviar).
 */
export default function CreateProductPage() {
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const router = useRouter();
  const guard = useUnsavedGuard();
  const canManage = hasPermission("catalog:manage");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Link
        href="/catalog/products"
        onClick={(event) => {
          if (!guard.dirty) return;
          event.preventDefault();
          guard.leave("/catalog/products");
        }}
        className="inline-flex min-h-6 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Productos
      </Link>

      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Catálogo · nuevo</p>
        <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight sm:text-[2.5rem]">Crear producto</h1>
        <p className="text-sm text-muted-foreground">Completa la ficha; las variantes y el stock se pueden ajustar después.</p>
      </header>

      {canManage ? (
        <ProductForm
          setAlert={showAlert}
          onDirtyChange={guard.track("form")}
          onCancel={() => guard.leave("/catalog/products")}
          onCreated={(created, { pendingRequiredAttributes }) => {
            showAlert({ tone: "success", title: "Producto creado" });
            const params = pendingRequiredAttributes ? "?pending_attributes=1" : "";
            router.replace(`/catalog/products/${created.id}${params}`);
          }}
        />
      ) : (
        <Alert className="max-w-2xl rounded-2xl">
          <Eye aria-hidden="true" />
          <AlertTitle>Puedes ver el catálogo, pero no cambiarlo</AlertTitle>
          <AlertDescription>
            Para crear productos pide a un administrador el permiso para gestionar el catálogo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
