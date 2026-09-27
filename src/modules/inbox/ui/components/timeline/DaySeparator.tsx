/**
 * Separador de día del hilo (patrón WhatsApp/Telegram): chip centrado que se
 * queda pegado arriba al hacer scroll. SÓLIDO desde Inbox premium F2: la
 * píldora del lienzo aprobado, borde fino y sombra corta, sin el cristal de
 * antes, igual que el resto de marcadores del hilo. `z-[1]` es local al scroller;
 * `pointer-events-none` para no tapar el mensaje que pasa por debajo.
 */
export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="pointer-events-none sticky top-2 z-[1] flex justify-center py-1">
      <h3 className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-foreground shadow-float">
        {label}
      </h3>
    </div>
  )
}
