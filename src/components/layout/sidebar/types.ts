import type { LucideIcon } from "lucide-react";

export type SidebarNavItem = {
    title: string
    url?: string
    icon?: LucideIcon
    children?: SidebarNavItem[]
}
  
export type SidebarSection = {
label: string
items: SidebarNavItem[]
}

// DTOs desde backend (icon como string)
export type SidebarItemDTO = {
  title: string
  url?: string
  icon?: string
  children?: SidebarItemDTO[]
}

export type SidebarSectionDTO = {
  label: string
  items: SidebarItemDTO[]
}