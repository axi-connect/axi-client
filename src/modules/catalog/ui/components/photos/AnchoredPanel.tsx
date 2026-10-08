"use client";

import { useMemo } from "react";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";

/**
 * Superficie flotante de la galería (lienzo: popover en escritorio, hoja en el
 * celular). En escritorio se ancla al elemento que la abrió —una foto, una
 * fila de variante— por su selector, sin envolverlo: los tiles viven dentro de
 * la rejilla ordenable y no deben cambiar de árbol.
 */
export function AnchoredPanel({
  open,
  onOpenChange,
  anchorSelector,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorSelector: string | null;
  /** Nombre accesible del panel (la hoja lo exige; en el popover va visible en el contenido) */
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const virtualRef = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () =>
          (anchorSelector ? document.querySelector(anchorSelector) : null)?.getBoundingClientRect() ??
          new DOMRect(window.innerWidth / 2, window.innerHeight / 3, 0, 0),
      },
    }),
    [anchorSelector],
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 rounded-t-[24px] p-0">
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-foreground/15" aria-hidden />
          <div className="min-h-0 overflow-y-auto">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        aria-label={title}
        className={className ?? "w-[23rem] rounded-[20px] p-0"}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
