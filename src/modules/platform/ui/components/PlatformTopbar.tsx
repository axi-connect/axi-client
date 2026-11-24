"use client";

/**
 * Barra superior del celular y la tableta (< 1024 px; en escritorio no hay
 * barra: la ruta va encima del contenido). Abre el menú, dice dónde estás
 * («axi · Plataforma») y trae la lupa del buscador.
 */
import { PanelLeft, Search } from "lucide-react";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { useSidebar } from "@/shared/components/layout/sidebar/core";
import { usePlatformCommand } from "./PlatformCommand";

export function PlatformTopbar() {
  const { toggleSidebar } = useSidebar();
  const { setOpen } = usePlatformCommand();
  return (
    <header className="glass flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3 lg:hidden">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Abrir menú"
        className="grid size-9 shrink-0 place-items-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      >
        <PanelLeft aria-hidden="true" className="size-4" />
      </button>
      <BrandMark className="size-6 shrink-0" aria-label="Axi Connect" />
      <span className="font-heading text-base leading-none font-bold tracking-tight">axi</span>
      <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-border px-2.5 text-[11.5px] text-muted-foreground">
        Plataforma
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar en la consola"
        className="ml-auto grid size-9 shrink-0 place-items-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Search aria-hidden="true" className="size-4" />
      </button>
    </header>
  );
}
