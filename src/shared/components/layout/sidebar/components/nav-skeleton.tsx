import {
  SidebarMenu,
  SidebarGroup,
  SidebarMenuItem,
  SidebarGroupContent,
  SidebarMenuSkeleton,
} from "@/shared/components/layout/sidebar/core"

/**
 * Anchos deterministas (nunca aleatorios: el sidebar se renderiza en SSR y
 * un ancho random produce mismatch de hidratación). La variación imita la
 * longitud desigual de los títulos reales del menú.
 */
const ITEM_WIDTHS = ["72%", "56%", "80%", "62%", "48%", "68%", "58%"]

/**
 * Skeleton estructural del menú de navegación: se muestra mientras
 * `AppSidebar` carga `/api/auth/sidebar`. Replica la forma de los ítems
 * (icono + etiqueta) para que el render final no "salte".
 */
export function SidebarNavSkeleton() {
  return (
    <SidebarGroup role="status" aria-label="Cargando menú" aria-busy="true">
      <SidebarGroupContent>
        <SidebarMenu>
          {ITEM_WIDTHS.map((width, index) => (
            <SidebarMenuItem key={index}>
              <SidebarMenuSkeleton showIcon width={width} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
