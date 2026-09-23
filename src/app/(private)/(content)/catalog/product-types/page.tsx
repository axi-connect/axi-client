"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DataTable } from "@/shared/components/features/data-table";
import { useAlert } from "@/core/providers/alert-provider";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import type { ProductTypeRow } from "@/modules/catalog/domain/product-type";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import {
  fetchProductTypes,
  productTypeColumns,
} from "@/modules/catalog/ui/tables/config/product-type.config";

/**
 * Tipos de producto (`/catalog/product-types`). Crear/editar viven en
 * páginas propias porque incluyen el editor de attribute set.
 */
export default function ProductTypesPage() {
  const { hasPermission } = useAuth();
  const { fetchProductTypes: refreshReference } = useCatalog();
  const canManage = hasPermission("catalog:manage");

  const [rows, setRows] = useState<ProductTypeRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { showAlert } = useAlert();

  const load = useCallback(async () => {
    try {
      const { rows: fetched } = await fetchProductTypes();
      setRows(fetched);
    } catch {
      showAlert({ tone: "error", title: "No se pudieron cargar los tipos de producto" });
    } finally {
      setLoaded(true);
    }
  }, [showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onDeleteSuccess = () => {
      showAlert({ tone: "success", title: "Tipo de producto eliminado" });
      void load();
      void refreshReference();
    };
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      showAlert({ tone: "error", title: detail?.message || "No se pudo completar la acción" });
    };
    window.addEventListener("product-types:delete:success", onDeleteSuccess);
    window.addEventListener("product-types:error", onError);
    return () => {
      window.removeEventListener("product-types:delete:success", onDeleteSuccess);
      window.removeEventListener("product-types:error", onError);
    };
  }, [load, refreshReference, showAlert]);

  const isEmpty = loaded && rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tipos de producto</h2>
          <p className="text-sm text-muted-foreground">
            Define atributos tipados por familia (material, talla, color…).
          </p>
        </div>
        {canManage && (
          <Button asChild className="rounded-full">
            <Link href="/catalog/product-types/create">
              <Plus className="h-4 w-4" />
              Nuevo tipo
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <GlassGlyph kind="catalog" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes tipos de producto. Son opcionales, pero dan superpoderes a tus fichas.
            </p>
            {canManage && (
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/catalog/product-types/create">
                  <Plus className="h-4 w-4" />
                  Crear el primero
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <DataTable<ProductTypeRow> data={rows} columns={productTypeColumns} pagination={{ pageSize: 10 }} />
        )}
      </div>

    </div>
  );
}
