import {
  PAYMENT_METHOD_CODES,
  PAYMENT_METHOD_LABELS,
  type WelcomeKitData,
} from "./welcome-kit";
import {
  displayUrl,
  firstName,
  formatClockTime,
  formatCop,
  formatFileSize,
  formatInteger,
  formatPhone,
  formatShortDate,
  joinEs,
  panelHref,
  trialEndDate,
  trialRange,
  whatsappHref,
} from "./formatters";

/**
 * Todo lo que pinta el kit, ya calculado. Es el `renderVals()` del template de
 * referencia (`kit.html` del paquete de diseño) pasado a una función pura: la UI
 * solo coloca estos valores y así el copy y los cálculos se prueban sin React.
 */

export type KitDayNode = "now" | "idle" | "meet" | "end";

export type KitDay = {
  n: string;
  title: string;
  body: string;
  /** Etiqueta a mano («llamada · 10 min»); vacía si el día no la lleva. */
  tag: string;
  node: KitDayNode;
  /** El conector hacia el día siguiente (el último no lo tiene). */
  hasLine: boolean;
  /** El primer tramo (hoy → mañana) va continuo; los demás, punteados. */
  lineStyle: "lead" | "dotted";
};

export type KitPaymentToggle = { code: string; label: string; on: boolean };

export type KitView = {
  businessName: string;
  agentName: string;
  agentTone: string;
  teamHours: string;
  catalogFile: string;
  catalogSize: string;
  catalogCount: string;
  payments: KitPaymentToggle[];
  advisorName: string;
  advisorFirstName: string;
  advisorPhone: string;
  advisorWaHref: string;
  trialRange: string;
  trialConversations: string;
  agentConnector: string;
  panelUrl: string;
  panelHref: string;
  loginEmail: string;
  digestTime: string;
  digestTimeUpper: string;
  planName: string;
  planConversations: string;
  priceFmt: string;
  listPriceFmt: string;
  planRows: { k: string; v: string }[];
  days: KitDay[];
};

const EMPTY = "—";

function buildDays(agentName: string): KitDay[] {
  const raw: [string, string, string, string, KitDayNode][] = [
    ["0", "Sesión de puesta en marcha", `${agentName} queda atendiendo, creas tu contraseña y recibes este kit.`, "", "now"],
    ["1", "Tu primer resumen de la mañana", "Los tres números de ayer, en tu WhatsApp.", "", "idle"],
    ["2", "Revisamos juntos 3 conversaciones", "Afinamos lo que haga falta: un tono, un precio, una respuesta.", "llamada · 10 min", "meet"],
    ["3", "Revisamos que todo avance", "Si algo no va como debe, te llamo ese mismo día.", "", "idle"],
    ["4", "Lo que llevas de la semana", "Los tres números, acumulados.", "", "idle"],
    ["5", "Vemos los resultados juntos", "Y te comparto el enlace de pago, por si decides seguir.", "reunión · 15 min", "meet"],
    ["6", "Mañana termina tu prueba", `Te cuento lo que vendió ${agentName} en la semana.`, "", "idle"],
    ["7", "Tú decides", "Si sigues, activas tu plan. Si no, no pagas nada.", "tu decisión", "end"],
  ];
  return raw.map(([n, title, body, tag, node], i) => ({
    n,
    title,
    body,
    tag,
    node,
    hasLine: i < raw.length - 1,
    lineStyle: i === 0 ? "lead" : "dotted",
  }));
}

export function buildKitView(data: WelcomeKitData): KitView {
  const enabled = new Set(data.paymentMethods);
  const payments = PAYMENT_METHOD_CODES.map((code) => ({
    code,
    label: PAYMENT_METHOD_LABELS[code],
    on: enabled.has(code),
  }));
  const payList = payments.filter((p) => p.on).map((p) => p.label);
  const digestTime = formatClockTime(data.advisor.digestTime);
  const end = trialEndDate(data.trial.startDate);

  return {
    businessName: data.businessName,
    agentName: data.agentName,
    agentTone: data.agentTone || EMPTY,
    teamHours: data.teamHours || EMPTY,
    catalogFile: data.catalog.fileName || "Tu catálogo",
    catalogSize: data.catalog.fileSizeBytes != null ? formatFileSize(data.catalog.fileSizeBytes) : "",
    catalogCount: formatInteger(data.catalog.productCount),
    payments,
    advisorName: data.advisor.fullName,
    advisorFirstName: firstName(data.advisor.fullName),
    advisorPhone: formatPhone(data.advisor.whatsappE164),
    advisorWaHref: whatsappHref(data.advisor.whatsappE164),
    trialRange: trialRange(data.trial.startDate),
    trialConversations: formatInteger(data.trial.conversations),
    agentConnector: `ASÍ TRABAJA ${data.agentName.toUpperCase()}`,
    panelUrl: displayUrl(data.panelUrl),
    panelHref: panelHref(data.panelUrl),
    loginEmail: data.loginEmail,
    digestTime,
    digestTimeUpper: digestTime.toUpperCase(),
    planName: data.plan.name,
    planConversations: formatInteger(data.plan.conversationsPerMonth),
    priceFmt: formatCop(data.plan.monthlyPriceCop),
    listPriceFmt: formatCop(data.plan.listPriceCop),
    planRows: [
      { k: "Primer cobro", v: `${formatShortDate(end, true)}, si decides seguir` },
      { k: "Pagas con", v: joinEs(payList) },
      { k: "Enlace de pago", v: "Te llega el día 5" },
      { k: "Tarjeta para empezar", v: "No hace falta" },
      { k: "IVA", v: "No aplica: pagas lo que ves" },
    ],
    days: buildDays(data.agentName),
  };
}
