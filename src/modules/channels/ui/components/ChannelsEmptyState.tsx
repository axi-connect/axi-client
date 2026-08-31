import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Vacío de la vista de canales.
 *
 * Antes duplicaba el layout del estado vacío estándar, con esta deuda anotada:
 * «unificar los estados vacíos del proyecto merece su propio PR de design
 * system, desacoplado de canales». Ese PR es este, y la deuda queda pagada: lo
 * que queda aquí es un adaptador fino que solo aporta el copy y la CTA del
 * módulo. Se conserva como componente —en vez de inlinearlo en `ChannelsView`—
 * porque la nota al pie y el botón forman una composición propia.
 */
export function ChannelsEmptyState() {
  return (
    <EmptyState
      glyph="connections"
      title="Todavía no tienes canales conectados"
      description="Conectar tu número de WhatsApp toma un par de minutos y no necesitas conocimientos técnicos. Te acompañamos paso a paso."
      action={
        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg">
            <Link href="/settings/channels/connect">
              <Plus aria-hidden="true" className="size-4" />
              Conectar un canal
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            También puedes conectar WhatsApp con código QR, Instagram o Messenger.
          </p>
        </div>
      }
    />
  );
}
