"use client";

import { KanbanSquare, ListChecks, Settings, Users } from "lucide-react";

import { useAuth } from "@/shared/auth/auth.hooks";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

/**
 * Cabecera + sub-navegación persistente de la sección full-bleed `/crm`.
 *
 * El filtro por permiso se queda aquí, no en `NavTabs`: el gate RBAC es del
 * módulo dueño de la sección, y así el componente de navegación no depende del
 * `AuthProvider` (y se puede testear sin montarlo).
 */
const NAV_ITEMS: ReadonlyArray<NavTabItem & { permission?: string }> = [
  { href: "/crm/contacts", label: "Contactos", icon: Users },
  { href: "/crm/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/crm/tasks", label: "Tareas", icon: ListChecks },
  { href: "/crm/settings", label: "Configuración", icon: Settings, permission: "crm:manage" },
];

export function CrmNav() {
  const { hasPermission } = useAuth();

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <header className="border-border shrink-0 border-b px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="font-heading text-lg font-bold tracking-tight">CRM</h1>
        <NavTabs items={items} label="Secciones del CRM" />
      </div>
    </header>
  );
}
