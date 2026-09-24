"use client";

import { Archive, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { DatasetListItem } from "../../../../domain/quality-datasets";

type DatasetRowActionsProps = {
  dataset: DatasetListItem;
  onImport: (dataset: DatasetListItem) => void;
  onRename: (dataset: DatasetListItem) => void;
  onArchive: (dataset: DatasetListItem) => void;
  onDelete: (dataset: DatasetListItem) => void;
};

export function DatasetRowActions({ dataset, onImport, onRename, onArchive, onDelete }: DatasetRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Acciones de ${dataset.name}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {dataset.status === "active" && (
          <DropdownMenuItem onClick={() => onImport(dataset)}>
            <Download aria-hidden="true" />
            Importar del tráfico real…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onRename(dataset)}>
          <Pencil aria-hidden="true" />
          Renombrar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onArchive(dataset)}>
          <Archive aria-hidden="true" />
          {dataset.status === "active" ? "Archivar" : "Reactivar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(dataset)} className="text-destructive focus:text-destructive">
          <Trash2 aria-hidden="true" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
