"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Ellipsis, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { StatusAlert } from "@/shared/components/ui/notice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { FLOW_DESCRIPTIONS, type FormFlow } from "@/modules/forms/domain/form";
import type { FormsValues } from "@/modules/forms/ui/forms/config/form-definition.config";

/**
 * Cabecera del flujo activo: descripción, estado activo/pausado y acciones.
 *
 * El switch es un CAMPO del formulario dirty, no un toggle con guardado
 * inmediato: debe haber una sola ruta de escritura. Un toggle inmediato tendría
 * que enviar el `fields` del borrador a medio editar, y omitir `is_active` en el
 * PUT reactivaría un formulario pausado (ver el adapter).
 */
export function FlowToolbar({
  form,
  flow,
  persisted,
  readOnly,
  onDelete,
  onPreview,
}: {
  form: UseFormReturn<FormsValues>;
  flow: FormFlow;
  persisted: boolean;
  readOnly: boolean;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const isActive = form.watch(`${flow}.is_active`);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{FLOW_DESCRIPTIONS[flow]}</p>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <Controller
              control={form.control}
              name={`${flow}.is_active`}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${flow}.is_active`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor={`${flow}.is_active`} className="cursor-pointer text-sm">
                    {field.value ? "Activo" : "Pausado"}
                  </Label>
                </div>
              )}
            />
          )}

          {/* La preview es de lectura: se ofrece también sin permiso de escritura. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9" aria-label="Más acciones">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPreview}>
                <MessageSquare className="size-4" />
                Ver conversación de ejemplo
              </DropdownMenuItem>
              {!readOnly && persisted && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="size-4" />
                  Eliminar el formulario
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/*
        Pausar RELAJA la validación: `getActiveForms` del backend solo ve los
        activos, así que el guard de las tools de cierre deja de bloquear. Es
        contraintuitivo, así que se dice explícitamente.
      */}
      {!isActive && (
        <StatusAlert
          tone="info"
          dismissible={false}
          compact
          title="Pausado: tu agente puede cerrar sin estos datos"
          description="Actívalo cuando quieras volver a exigirlos."
        />
      )}
    </div>
  );
}
