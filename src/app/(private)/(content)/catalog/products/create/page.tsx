"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { ProductForm } from "@/modules/catalog/ui/forms/ProductForm";

/**
 * Crear producto (página completa: el form es demasiado grande para modal).
 * Tras crear se redirige al detalle; si el tipo elegido tiene atributos
 * requeridos ámbito producto, se avisa que faltan por completar allí.
 */
export default function CreateProductPage() {
  const { showAlert } = useAlert();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/catalog/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Productos
        </Link>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Crear producto</h2>
        <p className="text-sm text-muted-foreground">
          Completa la ficha; las variantes y el stock se pueden ajustar después.
        </p>
      </div>

      <div className="max-w-4xl rounded-2xl border border-border bg-background p-4 md:p-6">
        <ProductForm
          setAlert={showAlert}
          onCreated={(created, { pendingRequiredAttributes }) => {
            const params = pendingRequiredAttributes ? "?pending_attributes=1" : "";
            router.replace(`/catalog/products/${created.id}${params}`);
          }}
        />
      </div>

    </div>
  );
}
