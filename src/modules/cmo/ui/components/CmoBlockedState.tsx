"use client";

import Link from "next/link";
import { Power } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useAxelAccessory } from "@/modules/cmo/infrastructure/hooks/use-axel-appearance";
import type { CmoBlocker } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelAvatar } from "./AxelAvatar";
import { AXEL_LABEL } from "./AxelHeroAvatar";
import { AxelStage } from "./AxelStage";

interface CmoBlockedStateProps {
  blocker: NonNullable<CmoBlocker>;
  /** Solo quien puede aprobar puede encender a Axel. */
  canManage: boolean;
}

/**
 * Axel no está disponible. Dos motivos, dos pantallas, y la diferencia importa
 * porque la salida del usuario no es la misma:
 *
 * - **`disabled`**: se arregla con un interruptor, así que la pantalla lleva el
 *   botón. Sin permiso, se le dice a quién pedírselo en vez de mostrarle un
 *   botón que va a dar 403.
 * - **`quota`**: no se arregla hoy, se arregla el próximo ciclo. Lo que la
 *   pantalla tiene que hacer es **quitar la ansiedad**: decir que los agentes
 *   siguen atendiendo. Es la promesa central del diseño de la cuota (agotar a
 *   Axel jamás para la atención) y si la pantalla no la repite, el dueño asume
 *   lo contrario. Dos frases: no hace falta más.
 */
export function CmoBlockedState({ blocker, canManage }: CmoBlockedStateProps) {
  const isQuota = blocker === "quota";
  const [accessory] = useAxelAccessory();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      {/* Dormido y estático: sin botón (no saluda), sin mirada, sin vida. */}
      <div role="img" aria-label={AXEL_LABEL} data-mood="asleep">
        <AxelStage>
          <AxelAvatar expression="asleep" accessory={accessory} transitionMs={0} />
        </AxelStage>
      </div>
      <h2 className="font-heading mt-5 text-xl font-bold">
        {isQuota ? "Axel agotó sus análisis" : "Axel está apagado"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {isQuota ? "Vuelve el próximo ciclo. Tus agentes siguen atendiendo." : "Enciéndelo para recibir propuestas."}
      </p>

      {canManage ? (
        <Button asChild className="mt-6">
          <Link href="/cmo/settings">
            <Power className="size-4" aria-hidden="true" />
            {isQuota ? "Ver ajustes" : "Encender a Axel"}
          </Link>
        </Button>
      ) : (
        <p className="mt-6 text-xs text-muted-foreground">Pídeselo a un administrador.</p>
      )}
    </div>
  );
}
