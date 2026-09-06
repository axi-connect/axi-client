import type { AgentTone } from "@/modules/onboarding/domain/agent-templates";

/**
 * La conversación de ejemplo del teléfono de vista previa (paso «Agentes»):
 * puro contenido, sin backend. El tono cambia las frases, el nombre y la
 * empresa entran en el saludo y el producto sale del nicho. Es una ilustración
 * de cómo hablará el agente, no una respuesta real: el prompt lo fija la
 * plantilla en el servidor.
 */
export type PreviewMessage = { from: "user" | "agent"; text: string };

/** Lo que un cliente preguntaría en cada tipo de negocio; «otro» cae al genérico. */
export const PREVIEW_PRODUCT: Record<string, { ask: string; item: string; fulfil: string }> = {
  restaurants: { ask: "¿Tienen hamburguesa doble?", item: "La doble", fulfil: "domicilio" },
  retail_fashion: { ask: "¿Tienen la chaqueta en talla M?", item: "La chaqueta en M", fulfil: "envío" },
  hotels_tourism: { ask: "¿Tienen habitación para el sábado?", item: "La habitación doble del sábado", fulfil: "reserva" },
  health_beauty: { ask: "¿Tienen cita para mañana?", item: "La cita de mañana a las 10", fulfil: "reserva" },
  real_estate: { ask: "¿Sigue disponible el apartamento?", item: "El apartamento", fulfil: "visita" },
  education: { ask: "¿Hay cupo en el curso de marzo?", item: "El cupo de marzo", fulfil: "matrícula" },
  professional_services: { ask: "¿Me pueden cotizar una asesoría?", item: "La asesoría", fulfil: "cita" },
  b2b_distribution: { ask: "¿Tienen la referencia 4020 en stock?", item: "La referencia 4020", fulfil: "pedido" },
  other: { ask: "¿Tienen disponible el producto?", item: "El producto", fulfil: "pedido" },
};

/** Cómo se presenta el agente: si el nombre ya lleva la empresa, no la repite. */
function intro(name: string, companyName: string | null): string {
  if (!companyName || name.toLowerCase().includes(companyName.toLowerCase())) return name;
  return `${name}, de ${companyName}`;
}

export function previewConversation(input: {
  name: string;
  tone: AgentTone;
  companyName: string | null;
  nicheCode: string | null;
}): readonly PreviewMessage[] {
  const who = intro(input.name.trim() || "tu agente", input.companyName);
  const product = PREVIEW_PRODUCT[input.nicheCode ?? "other"] ?? PREVIEW_PRODUCT.other;
  switch (input.tone) {
    case "formal":
      return [
        { from: "agent", text: `Buenas tardes. Le atiende ${who}. ¿En qué puedo ayudarle?` },
        { from: "user", text: product.ask },
        { from: "agent", text: `Con gusto. ${product.item} está disponible. ¿Desea que gestione la ${product.fulfil} ahora?` },
        { from: "user", text: "Sí, por favor." },
        { from: "agent", text: "Perfecto. Queda a su nombre; le confirmo por aquí en un momento." },
      ];
    case "directo":
      return [
        { from: "agent", text: `Hola, soy ${who}. Dime qué necesitas.` },
        { from: "user", text: product.ask },
        { from: "agent", text: `Sí. ${product.item}, disponible. ¿Te hago la ${product.fulfil}?` },
        { from: "user", text: "Dale." },
        { from: "agent", text: "Hecho. Te confirmo por aquí." },
      ];
    case "cercano":
    default:
      return [
        { from: "agent", text: `¡Hola! Soy ${who}. ¿En qué te ayudo hoy?` },
        { from: "user", text: product.ask },
        { from: "agent", text: `¡Claro! ${product.item} está disponible. ¿Te hago la ${product.fulfil} ya mismo?` },
        { from: "user", text: "Sí, porfa." },
        { from: "agent", text: "Listo, queda a tu nombre. Cualquier cosa me escribes por aquí." },
      ];
  }
}
