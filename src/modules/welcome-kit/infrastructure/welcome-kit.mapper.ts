import {
  PAYMENT_METHOD_CODES,
  type PaymentMethodCode,
  type WelcomeKitData,
} from "../domain/welcome-kit";
import type { WelcomeKitSource } from "./welcome-kit.dto";

/**
 * Datos del kit del servidor (snake_case) → los que pinta la UI. Uno solo para
 * la página pública del kit y para la pestaña «Kit» de «Preparar entrega».
 */

function isPaymentMethod(code: string): code is PaymentMethodCode {
  return (PAYMENT_METHOD_CODES as readonly string[]).includes(code);
}

/** «1.000 conversaciones» → 1000. Sin cifra, 0. */
function conversationsOf(label: string | null): number {
  const digits = label?.replace(/\D/g, "") ?? "";
  return digits === "" ? 0 : Number(digits);
}

export function welcomeKitFromWire(kit: WelcomeKitSource): WelcomeKitData {
  return {
    businessName: kit.business_name,
    ownerFirstName: kit.owner_first_name,
    agentName: kit.agent.name ?? "",
    agentTone: kit.agent.tone_label ?? kit.agent.tone,
    teamHours: kit.team_hours,
    loginEmail: kit.login_email,
    panelUrl: kit.panel_url,
    // Un medio que el kit no sabe pintar se descarta en vez de romper la página.
    paymentMethods: kit.payment_methods.map((method) => method.kind).filter(isPaymentMethod),
    catalog: { fileName: null, fileSizeBytes: null, productCount: kit.catalog.product_count },
    advisor: {
      fullName: kit.advisor.name,
      whatsappE164: kit.advisor.whatsapp_e164,
      digestTime: kit.digest.time,
    },
    trial: { startDate: kit.trial.start_date, conversations: kit.trial.conversations ?? 0 },
    plan: {
      name: kit.plan?.name ?? "",
      monthlyPriceCop: Math.round((kit.plan?.amount_cents ?? 0) / 100),
      listPriceCop: Math.round((kit.plan?.list_amount_cents ?? 0) / 100),
      conversationsPerMonth: conversationsOf(kit.plan?.volume_tier_label ?? null),
    },
  };
}
