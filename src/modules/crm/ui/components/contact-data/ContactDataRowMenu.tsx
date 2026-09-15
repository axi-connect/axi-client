"use client";

import { Ellipsis, History, LockOpen, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

/**
 * Menú ⋯ de la fila: Ver historial (deshabilitado en F1, «Próximamente»),
 * «Dejar que el agente lo actualice» (liberar un campo protegido), separador y
 * «Rechazar dato» en destructive.
 */
export function ContactDataRowMenu({
  fieldLabel,
  canRelease,
  busy,
  onRelease,
  onReject,
}: {
  fieldLabel: string;
  /** Solo un campo protegido se puede liberar; en el resto sería un no-op. */
  canRelease: boolean;
  busy: boolean;
  onRelease: () => void;
  onReject: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={`Más acciones de ${fieldLabel}`}
          disabled={busy}
        >
          <Ellipsis className="size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Deshabilitado sin `disabled`: un botón inerte no dispara el tooltip
                que explica por qué no hace nada. */}
            <span
              role="menuitem"
              aria-disabled="true"
              tabIndex={-1}
              className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm text-muted-foreground opacity-60 outline-none focus:bg-accent"
            >
              <History className="size-3.5" aria-hidden />
              Ver historial
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">Próximamente</TooltipContent>
        </Tooltip>
        {canRelease && (
          <DropdownMenuItem className="flex items-center gap-2.5" onClick={onRelease}>
            <LockOpen className="size-3.5 text-muted-foreground" aria-hidden />
            Dejar que el agente lo actualice
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2.5 text-destructive hover:text-destructive focus:text-destructive"
          onClick={onReject}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Rechazar dato
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
