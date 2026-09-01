"use client";

import * as React from "react";

import { cn } from "@/core/lib/utils";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

/**
 * Un interruptor con su descripción y, si aplica, su aviso.
 *
 * El aviso llega como nodo y se pinta DEBAJO, dentro de la misma fila, porque
 * habla de esta elección y no del panel: un aviso que vive arriba del todo se
 * lee como una advertencia general y nadie lo relaciona con el interruptor que
 * acaba de tocar.
 *
 * La etiqueta es un `<Label htmlFor>` de verdad y no un `<span>` al lado: así
 * el texto también conmuta el interruptor, que es la zona de toque que
 * cualquiera intenta primero.
 */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
  caution,
  disabled,
  className,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  caution?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="text-foreground text-sm font-medium">
            {label}
          </Label>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">{description}</p>
          ) : null}
        </div>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
      {caution}
    </div>
  );
}
