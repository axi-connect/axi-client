"use client";

import { MapPin, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { hasCoordinates, inheritsCompanyHours, type BranchDTO } from "@/modules/companies/domain/branch";

/** Una fila de la lista: nombre, dirección · ciudad, indicaciones y origen del horario. */
export function BranchCard({
  branch,
  onEdit,
  onDelete,
}: {
  branch: BranchDTO;
  onEdit: (branch: BranchDTO) => void;
  onDelete: (branch: BranchDTO) => void;
}) {
  return (
    <article
      className={`grid grid-cols-[40px_1fr_auto] items-start gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5 ${branch.is_active ? "" : "opacity-70"}`}
      aria-label={branch.name}
    >
      <div
        className={`grid size-10 place-items-center rounded-xl ${branch.is_main ? "bg-accent-violet/10 text-accent-violet" : "bg-secondary text-foreground"}`}
      >
        <MapPin className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          <span className="truncate">{branch.name}</span>
          {branch.is_main ? <Badge>Principal</Badge> : null}
          {branch.is_active ? null : <Badge variant="secondary">Inactiva</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {branch.address}
          {branch.city ? ` · ${branch.city}` : ""}
          {hasCoordinates(branch) ? "" : " · sin pin en el mapa"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={branch.directions ? "" : "text-muted-foreground"}>
            {branch.directions ?? "Sin indicaciones"}
          </span>
          <span aria-hidden className="text-muted-foreground">·</span>
          {inheritsCompanyHours(branch) ? (
            <span className="text-muted-foreground">Horario de la empresa</span>
          ) : (
            <Badge variant="outline" className="border-transparent bg-accent-violet/10 text-accent-violet">
              Horario propio
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${branch.name}`} onClick={() => onEdit(branch)}>
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${branch.name}`} onClick={() => onDelete(branch)}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </article>
  );
}
