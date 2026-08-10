import Link from "next/link";
import { Plug, Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * Vacío de la vista de canales.
 *
 * Componente propio del slice y no el `EmptyState` de `modules/platform`:
 * promoverlo a `shared` obligaba a reapuntar quince archivos del panel de
 * super-admin, que no tienen nada que ver con esta feature, y un PR de canales
 * que toca quince archivos ajenos es un PR que nadie puede revisar por su diff.
 * El coste es esta veintena de líneas de layout.
 *
 * Deuda consciente: unificar los estados vacíos del proyecto merece su propio PR
 * de design system, desacoplado de canales.
 */
export function ChannelsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-brand">
        <Plug aria-hidden="true" className="size-5.5" />
      </span>
      <h2 className="text-xl font-semibold tracking-tight">Todavía no tienes canales conectados</h2>
      <p className="max-w-[44ch] text-muted-foreground">
        Conectar tu número de WhatsApp toma un par de minutos y no necesitas conocimientos
        técnicos. Te acompañamos paso a paso.
      </p>
      <Button asChild size="lg" className="mt-1">
        <Link href="/settings/channels/connect">
          <Plus aria-hidden="true" className="size-4" />
          Conectar un canal
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        También puedes conectar WhatsApp escaneando un código QR.
      </p>
    </div>
  );
}
