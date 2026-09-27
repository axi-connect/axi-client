"use client";

import type { CatalogListItemDTO } from "@/modules/catalog/domain/catalog";
import type { ProductKind } from "@/modules/catalog/domain/product";
import type { ProductListFilterKey, ProductListFilters } from "@/modules/catalog/domain/product-list-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const ALL = "__all__";

export type CategoryOption = { id: string; label: string; depth: number };

const TRIGGER = "h-9 w-full min-w-0 rounded-full sm:w-auto sm:min-w-36 [&>span]:truncate";

/**
 * Filtros del listado de productos: catálogo, categoría, tipo y estado (los
 * de la isla —sin fotos, agotados…— llegan por la URL y se ven como chips).
 * Controlados por el estado de la URL (`product-list-query.ts`); cambiar uno
 * vuelve a la página 1. El «Limpiar» vive en la fila de chips, junto a lo que
 * limpia.
 */
export function ProductFilters({
  value,
  onChange,
  catalogs,
  categories,
}: {
  value: ProductListFilters;
  onChange: <K extends ProductListFilterKey>(key: K, next: ProductListFilters[K]) => void;
  catalogs: CatalogListItemDTO[];
  categories: CategoryOption[];
}) {
  // El valor visible puede truncarse en el celular: el `title` lo dice entero.
  const catalogLabel = catalogs.find((catalog) => catalog.id === value.catalog_id)?.name ?? "Todos los catálogos";
  const categoryLabel = categories.find((category) => category.id === value.category_id)?.label ?? "Todas las categorías";
  const kindLabel = value.kind === "service" ? "Servicios" : value.kind === "product" ? "Productos" : "Todo";
  const stateLabel = value.is_active === undefined ? "Cualquier estado" : value.is_active ? "Activos" : "Inactivos";

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center [&>*]:min-w-0">
      <Select
        value={value.catalog_id ?? ALL}
        onValueChange={(v: string) => onChange("catalog_id", v === ALL ? undefined : v)}
      >
        <SelectTrigger className={TRIGGER} aria-label="Filtrar por catálogo" title={catalogLabel}>
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
        onValueChange={(v: string) => onChange("category_id", v === ALL ? undefined : v)}
      >
        <SelectTrigger className={TRIGGER} aria-label="Filtrar por categoría" title={categoryLabel}>
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
        onValueChange={(v: string) => onChange("kind", v === ALL ? undefined : (v as ProductKind))}
      >
        <SelectTrigger className={TRIGGER} aria-label="Filtrar por tipo" title={kindLabel}>
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
        onValueChange={(v: string) => onChange("is_active", v === ALL ? undefined : v === "active")}
      >
        <SelectTrigger className={TRIGGER} aria-label="Filtrar por estado" title={stateLabel}>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Cualquier estado</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="inactive">Inactivos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
