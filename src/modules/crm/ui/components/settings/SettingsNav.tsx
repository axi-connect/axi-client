"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Filter, KanbanSquare, Tag, Upload } from "lucide-react";

import { useAuth } from "@/shared/auth/auth.hooks";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

const NAV_ITEMS: readonly NavTabItem[] = [
  { href: "/crm/settings/pipelines", label: "Pipelines", icon: KanbanSquare },
  { href: "/crm/settings/tags", label: "Etiquetas", icon: Tag },
  { href: "/crm/settings/segments", label: "Segmentos", icon: Filter },
  { href: "/crm/settings/imports", label: "Imports", icon: Upload },
];

/**
 * Sub-nav de Configuración del CRM. Toda la sección exige `crm:manage`
 * (guard UX — el backend valida siempre): sin permiso, fuera de la sección.
 */
export function SettingsNav() {
  const router = useRouter();
  const { hasPermission, status } = useAuth();
  const allowed = hasPermission("crm:manage");

  useEffect(() => {
    if (status === "authenticated" && !allowed) router.replace("/crm/pipeline");
  }, [status, allowed, router]);

  return <NavTabs items={NAV_ITEMS} label="Secciones de configuración" surface="inline" />;
}
