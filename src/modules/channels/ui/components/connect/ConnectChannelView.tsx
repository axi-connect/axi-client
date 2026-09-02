"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ConnectChannelFlow } from "./ConnectChannelFlow";

/**
 * `/settings/channels/connect` — la página del wizard. El flujo de cuatro pasos
 * vive en `ConnectChannelFlow` (también lo embebe el onboarding); aquí solo va
 * el cromo de página: el enlace de vuelta y el cierre del camino manual, que
 * lleva al listado porque ese camino no devuelve el canal creado y el listado
 * ya refresca desde el store.
 */
export function ConnectChannelView() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="-ml-3 w-fit text-muted-foreground">
        <Link href="/settings/channels">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Canales
        </Link>
      </Button>

      <ConnectChannelFlow onManualCreated={() => router.push("/settings/channels")} />
    </div>
  );
}
