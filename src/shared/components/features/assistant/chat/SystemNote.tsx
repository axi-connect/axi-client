import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Un aviso del sistema en medio del hilo. Sin la identidad del asistente a
 * propósito: nadie debe atribuirle al personaje algo que dijo el sistema.
 */
export function SystemNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("self-center rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground", className)}>
      {children}
    </p>
  );
}
