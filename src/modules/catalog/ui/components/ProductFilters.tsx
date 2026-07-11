"use client";

import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { CatalogListItemDTO } from "@/modules/catalog/domain/catalog";
import type { ProductKind } from "@/modules/catalog/domain/product";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const ALL = "__all__";

export type ProductFiltersValue = {
  catalog_id?: string;
  category_id?: string;
  kind?: ProductKind;
  is_active?: boolean;
};

export type CategoryOption = { id: string; label: string; depth: number };

/**
 * Filtros del listado de productos (catálogo, categoría, tipo, estado).
 * Cambiar cualquiera reinicia a la página 1 (lo maneja `usePaginatedList`).
 */
export function ProductFilters({
  value,
  onChange,
  catalogs,
  categories,
}: {
  value: ProductFiltersValue;
  onChange: (value: ProductFiltersValue) => void;
  catalogs: CatalogListItemDTO[];
  categories: CategoryOption[];
}) {
  const hasFilters =
    value.catalog_id !== undefined ||
    value.category_id !== undefined ||
    value.kind !== undefined ||
    value.is_active !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.catalog_id ?? ALL}
        onValueChange={(v: string) => onChange({ ...value, catalog_id: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-40" aria-label="Filtrar por catálogo">
          <SelectValue placeholder="Catálogo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los catálogos</SelectItem>
          {catalogs.map((catalog) => (
            <SelectItem key={catalog.id} value={catalog.id}>
              {catalog.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.category_id ?? ALL}
        onValueChange={(v: string) => onChange({ ...value, category_id: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-44" aria-label="Filtrar por categoría">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {`${"— ".repeat(category.depth)}${category.label}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.kind ?? ALL}
        onValueChange={(v: string) =>
          onChange({ ...value, kind: v === ALL ? undefined : (v as ProductKind) })
        }
      >
        <SelectTrigger className="h-9 w-32" aria-label="Filtrar por tipo">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todo</SelectItem>
          <SelectItem value="product">Productos</SelectItem>
          <SelectItem value="service">Servicios</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.is_active === undefined ? ALL : value.is_active ? "active" : "inactive"}
        onValueChange={(v: string) =>
          onChange({ ...value, is_active: v === ALL ? undefined : v === "active" })
        }
      >
        <SelectTrigger className="h-9 w-32" aria-label="Filtrar por estado">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Cualquier estado</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="inactive">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => onChange({})}>
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
