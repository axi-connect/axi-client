"use client";

import { useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  buildReturnUrl,
  buildWompiCheckoutUrl,
} from "@/modules/billing/domain/checkout";
import {
  createCheckoutSession,
  createPublicCheckoutSession,
} from "@/modules/billing/infrastructure/services/billing-service.adapter";

/**
 * Arranca el pago de una factura: pide la sesión firmada y **redirige** al
 * checkout de Wompi.
 *
 * Sirve a las dos superficies. Con `token` va por el endpoint público (el
 * pagador no tiene sesión) y arrastra el token a la URL de retorno, que sin él
 * no podría consultar el estado de la factura.
 *
 * Los 502/503 de la pasarela **nunca se presentan como «tu pago falló»**: un
 * timeout puede llegar después de que Wompi creara el cobro, y decirle al
 * usuario que reintente acabaría en un pago doble. El texto sale de
 * `error-messages.ts`, que ya redacta esos dos códigos con ese cuidado.
 */
export function useStartCheckout(): {
  start: (invoiceId: string, token?: string) => Promise<void>;
  starting: boolean;
} {
  const { showAlert } = useAlert();
  const [starting, setStarting] = useState(false);

  async function start(invoiceId: string, token?: string): Promise<void> {
    setStarting(true);
    try {
      const session =
        token === undefined
          ? await createCheckoutSession(invoiceId)
          : await createPublicCheckoutSession(invoiceId, token);

      // Defensa explícita: sin firma no se abre el checkout. Generarla aquí
      // exigiría el secreto de integridad, así que la ausencia es un bug del
      // backend y no algo que el cliente pueda apañar.
      if (session.signature === "") {
        throw new Error("La sesión de pago llegó sin firma de integridad");
      }

      const returnUrl = buildReturnUrl(window.location.origin, invoiceId, token);
      window.location.assign(buildWompiCheckoutUrl(session, returnUrl));
    } catch (error) {
      setStarting(false);
      showAlert({
        tone: "error",
        title: "No pudimos abrir el pago",
        description: errorMessage(error),
        autoCloseMs: 9000,
      });
    }
    // Sin `finally`: en el camino feliz la pestaña ya está navegando a Wompi y
    // apagar el spinner solo haría parpadear el botón.
  }

  return { start, starting };
}
