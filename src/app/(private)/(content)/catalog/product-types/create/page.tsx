"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { ProductTypeForm } from "@/modules/catalog/ui/forms/ProductTypeForm";

/**
 * Crear tipo de producto. El backend no acepta atributos en el POST:
 * tras crear se redirige al detalle, donde vive el editor del set.
 */
export default function CreateProductTypePage() {
  const router = useRouter();
  const { fetchProductTypes } = useCatalog();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/catalog/product-types"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tipos de producto
        </Link>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Nuevo tipo de producto</h2>
        <p className="text-sm text-muted-foreground">
          Primero el nombre; después podrás definir sus atributos.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-border bg-background p-4 md:p-6">
        <ProductTypeForm
          setAlert={(cfg) => {
            setAlertConfig(cfg);
            setAlertOpen(true);
          }}
          onSaved={async (created) => {
            await fetchProductTypes();
            router.replace(`/catalog/product-types/${created.id}`);
          }}
        />
      </div>

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
