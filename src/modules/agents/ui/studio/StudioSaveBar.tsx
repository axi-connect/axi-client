"use client";

import { CircleAlert, CircleCheck, Info, Loader2, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";

/**
 * La barra pegada abajo: un solo sitio para guardar, cancelar y eliminar. El
 * error se dice aquí, en una frase (y el personaje pone la cara). Es cristal
 * porque flota sobre el contenido (DESIGN §5.1). `disabled` de «Guardar» hasta
 * que haya cambios: guardar lo mismo no es una acción.
 */
export function StudioSaveBar({
  mode,
  dirty,
  saving,
  error,
  justSaved,
  onCancel,
  onDelete,
}: {
  mode: "create" | "edit";
  dirty: boolean;
  saving: boolean;
  error: string | null;
  justSaved: boolean;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  let message: React.ReactNode;
  let tone = "text-muted-foreground";
  if (saving) {
    message = (
      <>
        <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> Guardando…
      </>
    );
  } else if (error) {
    message = (
      <>
        <CircleAlert className="size-3.5 shrink-0" aria-hidden /> {error}
      </>
    );
    tone = "text-destructive";
  } else if (justSaved) {
    message = (
      <>
        <CircleCheck className="size-3.5" aria-hidden /> Guardado hace un momento
      </>
    );
    tone = "text-success";
  } else if (dirty) {
    message = (
      <>
        <Pencil className="size-3.5" aria-hidden /> Cambios sin guardar
      </>
    );
  } else if (mode === "create") {
    message = (
      <>
        <Info className="size-3.5" aria-hidden /> El agente nace en borrador: no atiende hasta que lo actives y un canal lo use.
      </>
    );
  } else {
    message = (
      <>
        <CircleCheck className="size-3.5" aria-hidden /> Todo guardado
      </>
    );
  }

  return (
    <div
      className={cn(
        "sticky bottom-3 z-20 flex flex-wrap items-center gap-2.5 rounded-2xl border border-border/80 py-2.5 pr-3 pl-4",
        "bg-background/75 shadow-[var(--shadow-float)] backdrop-blur-md backdrop-saturate-150",
      )}
    >
      <p className={cn("flex min-w-0 items-center gap-1.5 text-[13px]", tone)} role={error ? "alert" : "status"}>
        {message}
      </p>
      <span className="flex-1" />
      {mode === "edit" && onDelete ? (
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete} disabled={saving}>
          <Trash2 className="size-4" aria-hidden />
          Eliminar
        </Button>
      ) : null}
      <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
        Cancelar
      </Button>
      <Button type="submit" disabled={saving || (mode === "edit" && !dirty && !error)}>
        {mode === "create" ? "Crear agente" : error ? "Reintentar" : "Guardar cambios"}
      </Button>
    </div>
  );
}
