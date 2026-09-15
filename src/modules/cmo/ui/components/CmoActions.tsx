"use client";

import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { ThreadSwitcher } from "./ThreadSwitcher";

/**
 * Las tres acciones del despacho, en la esquina superior derecha del campo:
 * conversaciones, nueva conversación y ajustes. Viven fuera de la barra de Axel
 * a propósito: en el estado vacío la barra baja al centro con él, y tres iconos
 * flotando junto a la cara se leían como parte del personaje.
 */
export function CmoActions({ className }: { className?: string }) {
  const thinking = useCmoStore((state) => state.thread.thinking);
  const hasMessages = useCmoStore((state) => state.thread.messages.length > 0);
  const newThread = useCmoStore((state) => state.newThread);

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <ThreadSwitcher />
      <button
        type="button"
        onClick={newThread}
        disabled={thinking || !hasMessages}
        aria-label="Nueva conversación"
        title="Nueva conversación"
        className={ICON_BUTTON}
      >
        <Plus className="size-[17px]" aria-hidden="true" />
      </button>
      <Link href="/cmo/settings" aria-label="Ajustes de Axel" title="Ajustes de Axel" className={ICON_BUTTON}>
        <Settings2 className="size-[17px]" aria-hidden="true" />
      </Link>
    </div>
  );
}

export const ICON_BUTTON = cn(
  "grid size-[34px] place-items-center rounded-[10px] text-muted-foreground transition-colors",
  "hover:bg-foreground/[0.06] hover:text-foreground aria-expanded:bg-foreground/[0.06] aria-expanded:text-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  "disabled:pointer-events-none disabled:opacity-40",
);
