"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownUp, ChevronDown, Download, FileDown, Upload } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export interface ImportExportMenuProps {
  /** `contacts:import`: gatea «Descargar plantilla» e «Importar contactos». */
  canImport: boolean;
  /** `contacts:export`: gatea «Exportar contactos». */
  canExport: boolean;
  onDownloadTemplate: () => void;
  onImport: () => void;
  onExport: () => void;
}

/**
 * El único botón de datos de la cabecera de Contactos (mockup F0 aprobado
 * 2026-09-14): agrupa Plantilla · Importar · Exportar en el `DropdownMenu`
 * propio (glass, teclado). Cada ítem se gatea por su permiso; sin ninguno de
 * los dos, el botón no existe. El backend sigue siendo la barrera real.
 */
export function ImportExportMenu({
  canImport,
  canExport,
  onDownloadTemplate,
  onImport,
  onExport,
}: ImportExportMenuProps) {
  if (!canImport && !canExport) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <ArrowDownUp className="size-4" />
          Importar / Exportar
          <ChevronDown className="size-3.5 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px] rounded-2xl">
        {canImport && (
          <MenuEntry
            icon={FileDown}
            title="Descargar plantilla"
            description="Excel con las columnas esperadas"
            onClick={onDownloadTemplate}
          />
        )}
        {canImport && (
          <MenuEntry
            icon={Upload}
            title="Importar contactos"
            description="CSV o XLSX · hasta 10 MB"
            onClick={onImport}
          />
        )}
        {canImport && canExport && <DropdownMenuSeparator />}
        {canExport && (
          <MenuEntry
            icon={Download}
            title="Exportar contactos"
            description="CSV con los filtros activos · queda auditado"
            onClick={onExport}
            accent
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuEntry({
  icon: Icon,
  title,
  description,
  onClick,
  accent = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <DropdownMenuItem className="grid grid-cols-[2rem_1fr] items-center gap-3 rounded-[10px] px-2.5 py-2" onClick={onClick}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-[10px] text-foreground",
          accent ? "bg-accent" : "bg-secondary",
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium leading-tight">{title}</span>
        <span className="block text-xs leading-snug text-muted-foreground">{description}</span>
      </span>
    </DropdownMenuItem>
  );
}
