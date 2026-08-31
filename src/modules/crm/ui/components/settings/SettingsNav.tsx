"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Filter, KanbanSquare, Sparkles, Tag, Upload } from "lucide-react";

import { useAuth } from "@/shared/auth/auth.hooks";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

/**
 * Cada pestaña declara el permiso que la abre.
 *
 * Antes la sección entera exigía `crm:manage`, y eso convertía la pestaña de
 * tareas de agente en una trampa: su escritura pide `crm:automate`, que es un
 * código DISTINTO, así que un rol a medida con `crm:automate` y sin
 * `crm:manage` no habría podido llegar al interruptor de apagado — justo
 * durante la incidencia en que hace falta.
 */
const NAV_ITEMS: readonly (NavTabItem & { permission: string })[] = [
  { href: "/crm/settings/pipelines", label: "Pipelines", icon: KanbanSquare, permission: "crm:manage" },
  { href: "/crm/settings/tags", label: "Etiquetas", icon: Tag, permission: "crm:manage" },
  { href: "/crm/settings/segments", label: "Segmentos", icon: Filter, permission: "crm:manage" },
  { href: "/crm/settings/imports", label: "Imports", icon: Upload, permission: "crm:manage" },
  // Leer la política basta para verla: quien atiende la bandeja necesita poder
  // explicar por qué una tarea salió «El agente está pausado».
  { href: "/crm/settings/agent-tasks", label: "Tareas de agente", icon: Sparkles, permission: "crm:read" },
];

/** Sub-nav de Configuración del CRM (guard UX — el backend valida siempre). */
export function SettingsNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, status } = useAuth();

  const allowed = NAV_ITEMS.filter((item) => hasPermission(item.permission));
  const first = allowed[0]?.href;
  const onAllowedRoute = allowed.some((item) => pathname?.startsWith(item.href) === true);

  useEffect(() => {
    if (status !== "authenticated") return;
    // Sin ninguna pestaña, fuera de la sección; con alguna pero en una ruta
    // vedada, a la primera que sí puede ver.
    if (first === undefined) router.replace("/crm/pipeline");
    else if (!onAllowedRoute) router.replace(first);
  }, [status, first, onAllowedRoute, router]);

  return (
    <NavTabs
      items={allowed.map(({ permission: _permission, ...item }) => item)}
      label="Secciones de configuración"
      surface="inline"
    />
  );
}
