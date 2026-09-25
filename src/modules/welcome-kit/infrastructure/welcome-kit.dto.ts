import type { PaymentMethodCode } from "../domain/welcome-kit";

/**
 * TEMPORAL hasta schema.d.ts — sustituir por `Schemas["WelcomeKitDataDto"]`
 * cuando el servidor publique `GET /public/welcome/:token` en `openapi.json` y se
 * regenere el contrato (`npm run api:types`, una sola vez al cerrar el servidor).
 *
 * Forma de `kit-data.schema.json` del paquete de diseño (camelCase, como allí),
 * sin `passwordResetUrl` ni `kitToken`: el DTO público nunca lleva el enlace de
 * contraseña (contrato del plan, slice `delivery`). Si el servidor lo emite en
 * snake_case, solo cambia el mapper de `welcome-kit.loader.ts`: el dominio no se
 * entera.
 */
export type WelcomeKitDataWire = {
  businessName: string;
  ownerFirstName: string;
  agentName: string;
  agentTone?: string | null;
  teamHours?: string | null;
  loginEmail: string;
  panelUrl: string;
  paymentMethods: PaymentMethodCode[];
  catalog?: {
    fileName?: string | null;
    fileSizeBytes?: number | null;
    productCount?: number | null;
  } | null;
  advisor: {
    fullName: string;
    whatsappE164: string;
    /** `HH:mm`, hora de Colombia. */
    digestTime?: string | null;
  };
  session?: { date?: string | null } | null;
  trial: {
    /** `YYYY-MM-DD`. */
    startDate: string;
    conversations: number;
    callDay2At?: string | null;
    callDay5At?: string | null;
  };
  plan: {
    name: string;
    monthlyPriceCop: number;
    listPriceCop: number;
    conversationsPerMonth: number;
  };
};
