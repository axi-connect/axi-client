"use client";

import { LoaderCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Island } from "./Island";

/**
 * La barra de «Cambios sin guardar» de un formulario de ajustes (Cobros
 * premium, DESIGN-SYSTEM §9.5.1 y §9.7): isla de TINTA pegada abajo, que solo
 * existe mientras hay algo que guardar. Va DENTRO del `<form>`: «Descartar»
 * es un `reset` y «Guardar» un `submit`, así que no necesita callbacks.
 *
 * Sin cambios no se pinta nada: un «Guardar» encendido sin nada que guardar
 * invita a un clic que no hace nada.
 */
export function UnsavedChangesDock({
  dirty,
  submitting,
  invalid,
  detail,
  submitLabel = "Guardar cambios",
}: {
  dirty: boolean;
  submitting: boolean;
  invalid: boolean;
  /** Una línea de qué cambia al guardar. */
  detail?: string;
  submitLabel?: string;
}) {
  if (!dirty && !submitting) return null;
  const blockedId = invalid ? "unsaved-dock-invalid" : undefined;
  return (
    <Island
      as="footer"
      material="ink"
      aria-label="Cambios sin guardar"
      className="sticky bottom-3 z-10 flex w-full flex-col gap-3 p-3 pl-5 sm:flex-row sm:items-center sm:justify-between sm:rounded-full"
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold">Cambios sin guardar</span>
        {invalid ? (
          <span id={blockedId} className="text-xs text-muted-foreground">
            Revisa los campos marcados antes de guardar.
          </span>
        ) : detail ? (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 gap-2">
        <Button type="reset" variant="glass" disabled={submitting}>
          Descartar
        </Button>
        <Button
          type="submit"
          aria-disabled={invalid || submitting}
          aria-describedby={blockedId}
          className={invalid ? "opacity-60" : undefined}
          onClick={(event) => {
            if (invalid || submitting) event.preventDefault();
          }}
        >
          {submitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : null}
          {submitLabel}
        </Button>
      </span>
    </Island>
  );
}
