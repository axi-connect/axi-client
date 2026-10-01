import { cn } from "@/core/lib/utils";

/**
 * Listas agrupadas tipo Ajustes (editor de pilotos): un encabezado de grupo, filas
 * con la etiqueta a la izquierda y el valor o el control a la derecha, y una
 * nota al pie que explica.
 */
export function Group({ title, foot, children }: { title?: string; foot?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {title !== undefined && (
        <p className="text-muted-foreground px-4 pb-0.5 text-[11.5px] font-semibold tracking-[0.06em] uppercase">{title}</p>
      )}
      {children}
      {foot !== undefined && <p className="text-muted-foreground px-4 text-xs text-pretty">{foot}</p>}
    </div>
  );
}

/** El marco de las filas: un borde redondeado y un filo entre fila y fila. */
export function Rows({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-border bg-background divide-border flex flex-col divide-y overflow-hidden rounded-2xl border", className)}>
      {children}
    </div>
  );
}

/**
 * Una fila: etiqueta (con su pista debajo) y el valor o control a la derecha.
 * `stack` pone el control debajo, a todo el ancho (un campo de texto largo, el
 * deslizador).
 */
export function Row({
  label,
  hint,
  htmlFor,
  stack = false,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  stack?: boolean;
  children?: React.ReactNode;
}) {
  const Label = htmlFor === undefined ? "span" : "label";
  return (
    <div className={cn("flex min-h-12 min-w-0 gap-3.5 px-4 py-2.5", stack ? "flex-col items-stretch gap-2" : "items-center justify-between")}>
      <Label {...(htmlFor === undefined ? {} : { htmlFor })} className={cn("flex min-w-0 flex-col", !stack && "min-w-20 flex-1")}>
        <span className="text-sm font-medium">{label}</span>
        {hint !== undefined && <span className="text-muted-foreground text-xs text-pretty">{hint}</span>}
      </Label>
      {/* El control cede ancho antes que la etiqueta: un desplegable de 13 rem no aplasta «Fuente» a 375 px. */}
      {children !== undefined && <div className={cn("min-w-0", stack ? "w-full" : "flex shrink items-center justify-end")}>{children}</div>}
    </div>
  );
}
