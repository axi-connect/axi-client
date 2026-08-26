import type { Schemas } from "@/core/api/types";

/**
 * Construcción del checkout de Wompi, en TypeScript PURO.
 *
 * Se hace por **redirección al checkout web** y no con el widget `<script>`: el
 * widget se renderiza inyectando un `<script data-render="button">` dentro de un
 * `<form>` —un anti-patrón en React—, obliga a cargar un tercero en la ruta y no
 * aporta nada frente a una redirección.
 *
 * Reglas del contrato que no se negocian (KB §5):
 *
 * 1. **La firma NUNCA se calcula aquí.** Viene del servidor. Calcularla en el
 *    navegador exigiría el secreto de integridad, y con él cualquiera podría
 *    pagar $1.000 una factura de $1.000.000. Si algún día falta en la respuesta,
 *    es un bug del backend: no se genera en el cliente.
 * 2. **No se toca `amount_in_cents`, `currency` ni `reference`.** La firma cubre
 *    exactamente esos tres valores; cambiar un dígito la invalida y Wompi
 *    rechaza el pago.
 * 3. **`expiration-time` no se envía.** El servidor lo omite al firmar a
 *    propósito, así que añadirlo por nuestra cuenta rompería la firma.
 * 4. **`tax-in-cents:vat` no se envía.** La licencia SaaS va excluida de IVA;
 *    declarar un IVA que no existe es un problema tributario, no un detalle de
 *    formulario.
 */
export type CheckoutSessionDTO = Schemas["CheckoutSessionDto"];

export const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

/**
 * Query del checkout, armada a mano y NO con `URLSearchParams`.
 *
 * Motivo concreto: el parámetro se llama `signature:integrity`, y
 * `URLSearchParams` percent-codifica los dos puntos del NOMBRE
 * (`signature%3Aintegrity`). Los dos puntos son legales en un nombre de
 * parámetro, y preferimos enviarlo tal cual antes que depender de que la
 * pasarela decodifique el nombre igual que el valor.
 */
function queryOf(pairs: readonly [string, string][]): string {
  return pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
}

/**
 * URL del checkout web para una sesión ya firmada por el servidor.
 *
 * `redirectUrl` lo pone el frontend porque el backend devuelve `redirect_url`
 * SIEMPRE `null` en el checkout, y **no entra en la firma de integridad**, así
 * que fijarlo desde el cliente es seguro.
 */
export function buildWompiCheckoutUrl(
  session: CheckoutSessionDTO,
  redirectUrl: string,
): string {
  const pairs: [string, string][] = [
    ["public-key", session.public_key],
    ["currency", session.currency],
    ["amount-in-cents", String(session.amount_in_cents)],
    ["reference", session.reference],
    ["signature:integrity", session.signature],
    ["redirect-url", redirectUrl],
  ];
  return `${WOMPI_CHECKOUT_URL}?${queryOf(pairs)}`;
}

/**
 * URL de retorno del pago. Vive bajo `/pay` porque es **pública**: al mismo sitio
 * vuelve quien pagó desde el panel y quien pagó por el enlace sin sesión.
 *
 * El `token` viaja solo cuando el pago salió del enlace público: sin sesión, la
 * pantalla de confirmación no puede consultar el endpoint autenticado y necesita
 * el token para preguntar por el público. No expone nada nuevo — el token ya
 * estaba en la URL de la que viene.
 */
export function buildReturnUrl(
  origin: string,
  invoiceId: string,
  token?: string,
): string {
  const pairs: [string, string][] = [["invoice", invoiceId]];
  if (token !== undefined) pairs.push(["token", token]);
  return `${origin}/pay/return?${queryOf(pairs)}`;
}

/**
 * Escalón de reintentos de la pantalla de confirmación, en milisegundos.
 *
 * Con tarjeta el webhook llega en segundos; PSE y efectivo pueden tardar horas.
 * Así que esto NO es un poll infinito: son **seis intentos en poco más de dos
 * minutos** y después la pantalla se rinde con un mensaje honesto en vez de
 * girar para siempre.
 *
 * El techo también protege el throttle del endpoint público, que es de **10
 * peticiones por minuto y por IP**: seis peticiones repartidas en 128 segundos
 * dejan margen de sobra incluso si el usuario recarga.
 */
export const CONFIRMATION_BACKOFF_MS: readonly number[] = [
  2_000, 4_000, 8_000, 16_000, 32_000, 64_000,
];

/** Cuántos intentos como máximo, para no repetir el `.length` por ahí. */
export const CONFIRMATION_ATTEMPTS = CONFIRMATION_BACKOFF_MS.length;

/** Espera antes del intento `attempt` (0-based), o `null` si ya no hay más. */
export function confirmationDelay(attempt: number): number | null {
  return CONFIRMATION_BACKOFF_MS[attempt] ?? null;
}

/**
 * Desenlace de la confirmación a partir del estado de la factura.
 *
 * `pending` NO es un fallo: PSE y efectivo nacen así y el usuario vuelve al
 * comercio *antes* de que haya dinero. Es justo el escenario donde una
 * integración ingenua da por pagada una factura que nadie pagó.
 */
export type ConfirmationOutcome = "paid" | "partial" | "pending" | "unpayable";

export function outcomeFromStatus(
  status: string,
  outstandingCents: number,
): ConfirmationOutcome {
  if (status === "paid") return "paid";
  if (status === "void" || status === "uncollectible") return "unpayable";
  if (outstandingCents <= 0) return "paid";
  if (status === "partially_paid") return "partial";
  return "pending";
}

/** ¿Hay que seguir preguntando? Solo mientras el desenlace no esté decidido. */
export function shouldKeepPolling(outcome: ConfirmationOutcome): boolean {
  return outcome === "pending";
}
