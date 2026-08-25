import type { Paginated, Schemas } from "@/core/api/types";
import { http } from "@/core/services/http";
import type { BillingSummaryDTO } from "@/modules/billing/domain/account";
import type {
  InvoiceDTO,
  InvoiceDetailDTO,
  InvoiceLinkDTO,
} from "@/modules/billing/domain/invoice";
import type {
  PublicCheckoutSessionDTO,
  PublicInvoiceDTO,
} from "@/modules/billing/domain/public-invoice";

/**
 * Adapter HTTP de la facturación del TENANT (`/billing`).
 *
 * ⚠️ **Los códigos de estado no son los de siempre**: los `POST` que crean
 * devuelven **201** y el `DELETE` devuelve **204** sin cuerpo. El `HttpClient` ya
 * lo resuelve (un 204 se traduce a `undefined`), pero conviene no asumir 200.
 */

export type CheckoutSessionDTO = Schemas["CheckoutSessionDto"];
export type PaymentSourceDTO = Schemas["PaymentSourceListDto"]["data"][number];
export type AcceptanceTermsDTO = Schemas["AcceptanceTermsDto"];
export type BillingDataExportDTO = Schemas["BillingDataExportDto"];

export function getBillingSummary(): Promise<BillingSummaryDTO> {
  return http.get<BillingSummaryDTO>("/billing/summary");
}

/**
 * Facturas del tenant, más reciente primero.
 *
 * Solo acepta `page` y `page_size`: **no hay filtro por estado ni búsqueda** en
 * el servidor, así que el filtrado va en cliente sobre la página cargada (y la
 * vista lo dice, en vez de aparentar un filtro global).
 */
export function listInvoices(
  params: { page?: number; page_size?: number } = {},
): Promise<Paginated<InvoiceDTO>> {
  return http.get<Paginated<InvoiceDTO>>("/billing/invoices", { ...params });
}

export function getInvoice(invoiceId: string): Promise<InvoiceDetailDTO> {
  return http.get<InvoiceDetailDTO>(`/billing/invoices/${invoiceId}`);
}

/**
 * Prepara el pago de una factura → **201**.
 *
 * La `signature` viene calculada del servidor y el navegador solo la
 * transporta. Calcularla aquí exigiría el secreto de integridad, y con él
 * cualquiera podría pagar $1.000 una factura de $1.000.000. Si algún día falta
 * en la respuesta, es un bug del backend: no se genera en el cliente.
 */
export function createCheckoutSession(invoiceId: string): Promise<CheckoutSessionDTO> {
  return http.post<CheckoutSessionDTO>(`/billing/invoices/${invoiceId}/checkout-session`);
}

/**
 * Emite (o **rota**) el enlace público de pago → **201**.
 *
 * Emitir uno nuevo **invalida el anterior**: quien lo comparta tiene que saberlo,
 * porque el contador puede tener el viejo abierto.
 */
export function issueInvoiceLink(invoiceId: string): Promise<InvoiceLinkDTO> {
  return http.post<InvoiceLinkDTO>(`/billing/invoices/${invoiceId}/link`);
}

/** Devuelve la colección completa: no pagina ni busca. */
export async function listPaymentSources(): Promise<PaymentSourceDTO[]> {
  const res = await http.get<{ data: PaymentSourceDTO[] }>("/billing/payment-sources");
  return res.data;
}

/**
 * Términos de aceptación del habeas data. **Se piden al pintar el formulario, no
 * se cachean**: los permalinks son efímeros y caducan con el token.
 */
export function getAcceptanceTerms(): Promise<AcceptanceTermsDTO> {
  return http.get<AcceptanceTermsDTO>("/billing/acceptance-terms");
}

/** Derecho de acceso de la Ley 1581/2012. **Se audita** cada llamada. */
export function exportBillingData(): Promise<BillingDataExportDTO> {
  return http.get<BillingDataExportDTO>("/billing/data-export");
}

// ---------------------------------------------------------------------------
// Superficie PÚBLICA — sin sesión
// ---------------------------------------------------------------------------

/**
 * Vista pública de una factura, con token opaco y **sin sesión**.
 *
 * `authenticate: false` hace que el `HttpClient` salga **directo al backend** en
 * lugar de pasar por el BFF, y eso es deliberado: el throttle del endpoint es de
 * 10 req/min **por IP** (`ip:${request.ip}` en el guard del backend), así que si
 * el tráfico viajara por el servidor de Next todos los pagadores compartirían un
 * único cupo de diez. A cambio exige el origen del frontend en `CORS_ORIGINS`.
 *
 * Ese throttle también significa que **no se reintenta en bucle** desde aquí.
 */
export function getPublicInvoice(
  invoiceId: string,
  token: string,
): Promise<PublicInvoiceDTO> {
  return http.get<PublicInvoiceDTO>(
    `/public/billing/invoices/${invoiceId}/${encodeURIComponent(token)}`,
    undefined,
    { authenticate: false },
  );
}

export function createPublicCheckoutSession(
  invoiceId: string,
  token: string,
): Promise<PublicCheckoutSessionDTO> {
  return http.post<PublicCheckoutSessionDTO>(
    `/public/billing/invoices/${invoiceId}/${encodeURIComponent(token)}/checkout`,
    undefined,
    { authenticate: false },
  );
}
