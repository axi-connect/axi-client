/**
 * Formulario de «Preparar entrega»: el esquema Zod (validación local, la misma
 * forma que `DeliveryDraftDto` para que `applyServerValidation` caiga en el
 * campo correcto), los valores iniciales desde el contexto del servidor, el
 * paso a borrador de la API y el borrador guardado en este navegador.
 *
 * Diferencias con el DTO, y por qué:
 * - las citas se editan como `datetime-local` en la HORA DEL TENANT; al
 *   servidor van como ISO con offset (`toDeliveryDraft`);
 * - «sin promoción» es la cadena vacía (un `Select` no admite `undefined`);
 * - el WhatsApp admite espacios mientras se escribe («+57 300 482 1937»).
 */
import { z } from "zod";
import {
  compactPhone,
  E164_PATTERN,
  isEmail,
  isoToZonedInput,
  MAX_CC,
  normalizeEmail,
  zonedInputToIso,
} from "../../../domain/delivery";
import type {
  DeliveryContextWire,
  DeliveryDraftWire,
  OfferCatalogWire,
  OfferSelectionWire,
} from "../../../infrastructure/api/delivery.dto";

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const deliveryFormSchema = z.object({
  offer: z.object({
    package_code: z.string().min(1, "Elige un paquete"),
    volume_tier_code: z.string(),
    promotion_code: z.string(),
    billing_period: z.enum(["monthly", "annual"]),
  }),
  restart_trial: z.boolean(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige el día de la sesión"),
  call_day2_at: z.string().regex(LOCAL_DATETIME, "Elige el día y la hora de la llamada"),
  call_day5_at: z.string().regex(LOCAL_DATETIME, "Elige el día y la hora de la reunión"),
  digest_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elige la hora del resumen"),
  advisor: z.object({
    name: z.string().trim().min(2, "Escribe el nombre con el que firmas").max(60, "Hasta 60 caracteres"),
    whatsapp_e164: z
      .string()
      .trim()
      .refine((value) => E164_PATTERN.test(compactPhone(value)), "Escríbelo con el indicativo: +57 300 000 0000"),
    email: z
      .string()
      .trim()
      .refine(isEmail, "Escribe el correo donde quieres recibir las respuestas"),
  }),
  cc: z.array(z.string()).max(MAX_CC, `La copia admite hasta ${MAX_CC} correos`),
});

export type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

/** El paquete de la oferta guardada, si el catálogo lo reconoce (por código o por nombre). */
function savedPackage(context: DeliveryContextWire, catalog: OfferCatalogWire): string | null {
  const offer = context.offer;
  if (offer === null || offer.kind !== "package") return null;
  const match = catalog.packages.find(
    (pkg) => offer.plan_codes.includes(pkg.code) || pkg.name === offer.plan_name,
  );
  return match?.code ?? null;
}

/**
 * Valores iniciales: la oferta guardada si la hay; si no, el primer paquete
 * con el tramo y la promoción vigentes del catálogo. Citas, sesión y firma,
 * las que sugiere el servidor.
 */
export function formValuesFromContext(
  context: DeliveryContextWire,
  catalog: OfferCatalogWire,
): DeliveryFormValues {
  const tz = context.tenant.timezone;
  const offer = context.offer;
  const tierFromOffer = offer?.volume_tier_code ?? null;
  const tierKnown = catalog.tiers.some((tier) => tier.code === tierFromOffer);
  return {
    offer: {
      package_code: savedPackage(context, catalog) ?? catalog.packages[0]?.code ?? "",
      volume_tier_code: tierKnown ? tierFromOffer! : (catalog.default_tier ?? catalog.tiers[0]?.code ?? ""),
      promotion_code: offer ? (offer.promotion_code ?? "") : (catalog.promotion?.code ?? ""),
      billing_period: offer?.billing_period ?? "monthly",
    },
    // Enterprise o suspendida por otra causa: la prueba no aplica (lo dice el bloqueo).
    restart_trial: true,
    session_date: context.suggested.session_date,
    call_day2_at: isoToZonedInput(context.suggested.call_day2.at, tz),
    call_day5_at: isoToZonedInput(context.suggested.call_day5.at, tz),
    digest_time: context.suggested.digest_time,
    advisor: {
      name: context.advisor_suggestion?.name ?? "",
      whatsapp_e164: context.advisor_suggestion?.whatsapp_e164 ?? "",
      email: context.advisor_suggestion?.email ?? "",
    },
    cc: context.latest_delivery?.cc ?? [],
  };
}

/** La selección de oferta que entiende el servidor. */
export function toOfferSelection(offer: DeliveryFormValues["offer"]): OfferSelectionWire | null {
  if (offer.package_code === "") return null;
  return {
    package_code: offer.package_code,
    ...(offer.volume_tier_code ? { volume_tier_code: offer.volume_tier_code } : {}),
    ...(offer.promotion_code ? { promotion_code: offer.promotion_code } : {}),
    billing_period: offer.billing_period,
  };
}

/**
 * Valores del formulario → `DeliveryDraftDto`. null si todavía no se puede
 * pedir la vista previa (sin paquete o con una cita a medio escribir): el
 * servidor respondería un 400, no una vista previa.
 */
export function toDeliveryDraft(values: DeliveryFormValues, timeZone: string): DeliveryDraftWire | null {
  const offer = toOfferSelection(values.offer);
  const day2 = zonedInputToIso(values.call_day2_at, timeZone);
  const day5 = zonedInputToIso(values.call_day5_at, timeZone);
  if (offer === null || day2 === null || day5 === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.session_date)) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.digest_time)) return null;
  return {
    offer,
    restart_trial: values.restart_trial,
    session_date: values.session_date,
    call_day2_at: day2,
    call_day5_at: day5,
    digest_time: values.digest_time,
    advisor: {
      name: values.advisor.name.trim(),
      whatsapp_e164: compactPhone(values.advisor.whatsapp_e164.trim()),
      email: values.advisor.email.trim(),
    },
    cc: values.cc.map(normalizeEmail),
  };
}

/**
 * La vista previa se pide aunque la firma esté a medias: el servidor valida
 * la firma con zod y respondería 400. Mientras no es válida, va la sugerida
 * (o un marcador) para que el correo se siga viendo; el envío sí exige la real.
 */
export function toPreviewDraft(
  values: DeliveryFormValues,
  timeZone: string,
  fallbackAdvisor: DeliveryDraftWire["advisor"],
): DeliveryDraftWire | null {
  const draft = toDeliveryDraft(values, timeZone);
  if (draft === null) return null;
  const advisorOk = deliveryFormSchema.shape.advisor.safeParse(values.advisor).success;
  return {
    ...draft,
    advisor: advisorOk ? draft.advisor : fallbackAdvisor,
    // Un correo inválido o el del dueño en la copia no rompe la vista previa:
    // el del dueño sale como bloqueo; los inválidos, fuera.
    cc: draft.cc.filter(isEmail).slice(0, MAX_CC),
  };
}

/** Firma de muestra mientras no hay una válida escrita (nunca se envía). */
export const PREVIEW_ADVISOR_PLACEHOLDER: DeliveryDraftWire["advisor"] = {
  name: "Tu nombre",
  whatsapp_e164: "+570000000000",
  email: "welcome@axi-connect.co",
};

// ------------------------------------------------------------------ borrador local

/**
 * Se valida el TIPO de cada campo, no su contenido: un borrador puede
 * guardarse a medias (una firma sin terminar) y eso no lo invalida.
 */
const storedDraftSchema = z.object({
  version: z.literal(1),
  saved_at: z.string(),
  values: z.object({
    offer: z.object({
      package_code: z.string(),
      volume_tier_code: z.string(),
      promotion_code: z.string(),
      billing_period: z.enum(["monthly", "annual"]),
    }),
    restart_trial: z.boolean(),
    session_date: z.string(),
    call_day2_at: z.string(),
    call_day5_at: z.string(),
    digest_time: z.string(),
    advisor: z.object({ name: z.string(), whatsapp_e164: z.string(), email: z.string() }),
    cc: z.array(z.string()).max(MAX_CC),
  }),
});

export type StoredDeliveryDraft = { saved_at: string; values: DeliveryFormValues };

export function serializeDeliveryDraft(values: DeliveryFormValues, savedAt: Date): string {
  return JSON.stringify({ version: 1, saved_at: savedAt.toISOString(), values });
}

/**
 * Lee un borrador guardado. Lo que no sea un borrador de esta versión (otro
 * formato, JSON roto, campos que faltan) se ignora: la página arranca con los
 * valores del servidor en vez de romperse.
 */
export function parseStoredDeliveryDraft(raw: string | null): StoredDeliveryDraft | null {
  if (raw === null || raw === "") return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = storedDraftSchema.safeParse(data);
  return parsed.success ? { saved_at: parsed.data.saved_at, values: parsed.data.values } : null;
}
