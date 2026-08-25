"use client";

import { BookOpen, FolderTree, Package, Shapes } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

/**
 * Sub-navegación persistente de la sección `/catalog`.
 * El aspecto y el activo por prefijo los aporta `NavTabs` (DESIGN-SYSTEM §9.3).
 */
const NAV_ITEMS: readonly NavTabItem[] = [
  { href: "/catalog/products", label: "Productos", icon: Package },
  { href: "/catalog/categories", label: "Categorías", icon: FolderTree },
  { href: "/catalog/product-types", label: "Tipos de producto", icon: Shapes },
  { href: "/catalog/catalogs", label: "Catálogos", icon: BookOpen },
];

export function CatalogNav() {
  return <NavTabs items={NAV_ITEMS} label="Secciones del catálogo" />;
}
