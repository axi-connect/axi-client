/**
 * Separador de día del hilo (patrón WhatsApp/Telegram): chip centrado que se
 * queda pegado arriba al hacer scroll. Es `glass` a propósito — no es una
 * superficie de contenido sino un marcador que FLOTA sobre las burbujas, la
 * misma materia que el pill «Mensajes nuevos» del mismo scroller. `z-[1]` es
 * local al scroller (como en AppointmentsList); `pointer-events-none` para no
 * tapar el mensaje que pasa por debajo.
 */
export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="pointer-events-none sticky top-1 z-[1] flex justify-center">
      <h3 className="glass rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-float">
        {label}
      </h3>
    </div>
  )
}
