/**
 * Datos del kit de bienvenida tal como los consume la UI.
 *
 * Es la forma de `kit-data.schema.json` (paquete de diseño,
 * `docs/business/metodo-comercial/entregables/welcome-kit-handoff/`) SIN lo que
 * nunca puede llegar a una página pública: ni el enlace de contraseña
 * (`passwordResetUrl`) ni el token del kit. El mapeo desde el DTO del servidor
 * vive en `infrastructure/`; aquí solo hay TypeScript puro.
 */

/** Medios de pago que el kit sabe pintar, en el orden en que salen. */
export const PAYMENT_METHOD_CODES = ["nequi", "pse", "tarjeta", "contra_entrega"] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  nequi: "Nequi",
  pse: "PSE",
  tarjeta: "Tarjeta",
  contra_entrega: "Contra entrega",
};

export type WelcomeKitData = {
  businessName: string;
  ownerFirstName: string;
  agentName: string;
  agentTone: string | null;
  /** Ya formateado es-CO por el servidor («7:00 a. m. – 7:00 p. m.»). */
  teamHours: string | null;
  loginEmail: string;
  /** URL del panel; la UI la pinta sin protocolo. */
  panelUrl: string;
  paymentMethods: readonly PaymentMethodCode[];
  catalog: {
    fileName: string | null;
    fileSizeBytes: number | null;
    productCount: number;
  };
  advisor: {
    fullName: string;
    whatsappE164: string;
    /** `HH:mm`, hora de Colombia. */
    digestTime: string;
  };
  trial: {
    /** `YYYY-MM-DD`: el día 0. El día 7 es `startDate + 7`. */
    startDate: string;
    conversations: number;
  };
  plan: {
    name: string;
    monthlyPriceCop: number;
    listPriceCop: number;
    conversationsPerMonth: number;
  };
};

/** Resultado de abrir el kit: vigente, o ya no disponible (vencido o inexistente). */
export type WelcomeKitResult =
  | { status: "ok"; data: WelcomeKitData }
  | { status: "gone" }
  | { status: "unavailable" };
