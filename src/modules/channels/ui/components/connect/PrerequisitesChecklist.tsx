"use client";

import type { ChannelProvider } from "@/modules/channels/domain/channel-providers";
import { PrerequisitesChecklist as SharedPrerequisitesChecklist } from "@/shared/components/prerequisites-checklist";

/**
 * Paso 2 del wizard: los requisitos, antes del popup.
 *
 * La mecánica (casillas nativas, gate con motivo por `aria-describedby`, aviso
 * destacado en los ítems críticos) vive desde F8 en el componente compartido
 * `shared/components/prerequisites-checklist` — integraciones usa el mismo.
 * Aquí queda SOLO lo específico de canales: las salidas laterales para quien
 * no cumple algún punto, que hablan de números de WhatsApp y páginas de
 * Facebook y no tendrían sentido en una tienda de Shopify.
 */
export function PrerequisitesChecklist({
  provider,
  onContinue,
}: {
  provider: ChannelProvider;
  onContinue: () => void;
}) {
  return (
    <SharedPrerequisitesChecklist
      providerLabel={provider.label}
      items={provider.prerequisites}
      onContinue={onContinue}
      supportMessage={`Hola, quiero conectar ${provider.label} en Axi y tengo dudas con los requisitos.`}
      helpContent={
        <>
          <p className="font-semibold">No pasa nada, hay salida para cada caso</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">El número ya está en WhatsApp:</span>{" "}
            puedes borrar esa cuenta desde la app del celular y volver aquí, o usar un número
            distinto.
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              No administras la cuenta de Facebook del negocio:
            </span>{" "}
            pide que te den acceso como administrador, o que la persona que la maneja haga la
            conexión contigo.
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              Quieres probar sin comprometer tu número principal:
            </span>{" "}
            conecta primero con código QR y cámbiate al canal oficial más adelante.
          </p>
        </>
      }
    />
  );
}
