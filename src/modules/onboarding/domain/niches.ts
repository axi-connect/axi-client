/**
 * Nichos v1 (decisión D8 del plan, 2026-09-01): los cuatro del dueño y los
 * cuatro propuestos, más «Otro». Es un catálogo cerrado de contenido, por eso
 * vive aquí y no llega del backend: las plantillas de agente por nicho sí las
 * sirve `GET /onboarding/niches/:code/agent-templates` (F5). El `code` es el
 * wire (`onboarding_niche.code` en el backend).
 */
export type Niche = {
  code: string;
  name: string;
  /** Una frase de qué resuelve el producto para ese negocio. */
  description: string;
};

export const NICHES: readonly Niche[] = [
  { code: "restaurants", name: "Restaurantes y comida", description: "Menú, domicilios y pedidos por chat." },
  { code: "retail_fashion", name: "Retail y moda", description: "Catálogo con tallas, colores y stock." },
  { code: "hotels_tourism", name: "Hoteles y turismo", description: "Reservas, disponibilidad y ventas adicionales." },
  { code: "health_beauty", name: "Salud, belleza y citas", description: "Agenda intensiva y recordatorios." },
  { code: "real_estate", name: "Inmobiliarias", description: "Leads de alto valor y visitas agendadas." },
  { code: "education", name: "Educación y cursos", description: "Matrículas y seguimiento de interesados." },
  { code: "professional_services", name: "Servicios profesionales", description: "Cotizaciones, agenda y CRM." },
  { code: "b2b_distribution", name: "Distribuidores B2B", description: "Pedidos recurrentes y listas de precios." },
  { code: "other", name: "Otro tipo de negocio", description: "Plantillas generales que ajustas a tu medida." },
];

export function nicheByCode(code: string | null | undefined): Niche | null {
  if (!code) return null;
  return NICHES.find((niche) => niche.code === code) ?? null;
}
