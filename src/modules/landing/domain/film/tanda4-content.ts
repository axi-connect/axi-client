/**
 * Textos de la tanda 4 de la película (plan §16): precios, preguntas y cierre.
 *
 * Solo lo que no existía ya en `landing.content.ts` o `film-content.ts`; las
 * cifras salen del catálogo y las preguntas de `FAQ`. Vive aparte para que la
 * tanda 4 no edite el contenido de las otras escenas (reparto §17).
 */

export const FILM_PRICING = {
  eyebrow: "Precios",
  title: "Empieza gratis.",
  titleThin: "Crece a tu ritmo.",
  lead: "Todos los paquetes traen el producto completo. Lo que cambia es cuántas conversaciones atiende Axi al mes.",
  volumeSuffix: "conversaciones al mes",
  monthlyNote: "Facturado cada mes",
  /** «Pagas $ X al año · 1 mes gratis». */
  annualNote: (yearly: string, badge: string) => `Pagas ${yearly} al año · ${badge}`,
  enterpriseFrom: "Desde",
  /** El mismo argumento que cierra `PRICING.microcopy`. */
  perUser: "No cobramos por usuario: suma a todo tu equipo sin que cambie el precio.",
} as const;

export const FILM_FAQ = {
  eyebrow: "Preguntas",
  title: "Lo que nos",
  titleThin: "preguntan.",
  lead: "¿Tienes otra pregunta? Házsela a nuestro agente: atiende con Axi, igual que atendería a tus clientes.",
  cta: "Pregúntale a nuestro agente",
  whatsappMessage: "Hola, tengo una pregunta sobre Axi Connect.",
  live: "Axi atiende ahora · responde en segundos",
} as const;

export const FILM_CLOSE = {
  title: "Tu próxima venta",
  titleThin: "ya está escribiendo.",
  /** «Andrés está escribiendo»: el nombre sale del nicho. */
  typing: (name: string) => `${name} está escribiendo`,
  cta: "Prueba 7 días gratis",
  ctaHref: "/comenzar?plan=free_trial",
  agent: "Habla con nuestro agente",
  micro: "Sin tarjeta. Tu cuenta queda lista hoy.",
} as const;
