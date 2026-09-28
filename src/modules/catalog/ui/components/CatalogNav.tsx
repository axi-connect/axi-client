"use client";

import { BookOpen, FolderTree, Package, Shapes } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

/**
 * Sub-navegación persistente de la sección `/catalog`.
 * El aspecto y el activo por prefijo los aporta `NavTabs` (DESIGN-SYSTEM §9.3).
 * `productCount` pinta el total en la pestaña de Productos (catálogo premium).
 */
export function CatalogNav({ productCount }: { productCount?: number | null }) {
  const items: readonly NavTabItem[] = [
    { href: "/catalog/products", label: "Productos", icon: Package, count: productCount ?? null },
    { href: "/catalog/categories", label: "Categorías", icon: FolderTree },
    { href: "/catalog/product-types", label: "Tipos de producto", icon: Shapes },
    { href: "/catalog/catalogs", label: "Catálogos", icon: BookOpen },
  ];
  return <NavTabs items={items} label="Secciones del catálogo" />;
}
