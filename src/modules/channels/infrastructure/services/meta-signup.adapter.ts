import { isHttpError } from "@/core/api/problem";
import type { Schemas } from "@/core/api/types";
import { http } from "@/core/services/http";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type {
  MetaEmbeddedSignupDTO,
  MetaProduct,
  MetaSignupConfigDTO,
} from "@/modules/channels/domain/meta-signup";

/**
 * Adapter HTTP del onboarding de Meta (F2).
 *
 * Tres endpoints, todos con permiso `channels:manage`. Los tipos salen de
 * `Schemas[...]` vía `domain/meta-signup`: aquí no se declara ni un tipo propio
 * para respuestas del backend.
 */

/**
 * Configuración del Embedded Signup para un producto.
 *
 * `product` es query param **obligatorio** y la respuesta trae UN solo
 * `config_id`, no el mapa completo: hay una llamada por proveedor. Por eso se
 * pide al seleccionar el proveedor y no al montar la galería.
 *
 * Devuelve `null` en los dos casos en los que la capacidad simplemente no está,
 * que **no son errores** y llevan al camino manual:
 *
 * - `503 channels/meta_signup_disabled`: el flag está apagado o falta
 *   `app_id`/`app_secret`/`config_id` en el backend.
 * - `400`: la colisión de rutas que el plan del backend advirtió entre
 *   `GET /channels/meta/embedded-signup/config` y `GET /channels/:id`, que lleva
 *   `ParseUUIDPipe`. Si los controladores se registran en el orden equivocado,
 *   este endpoint responde "uuid inválido". Se trata como capacidad ausente y se
 *   deja rastro nombrando la causa, en vez de propagar un error incomprensible.
 */
export async function getMetaSignupConfig(
  product: MetaProduct,
): Promise<MetaSignupConfigDTO | null> {
  try {
    return await http.get<MetaSignupConfigDTO>("/channels/meta/embedded-signup/config", {
      product,
    });
  } catch (error) {
    if (isHttpError(error)) {
      if (error.code === "channels/meta_signup_disabled") return null;
      if (error.status === 400) {
        console.warn(
          "[meta-signup] La configuración devolvió 400. Sospecha de colisión de rutas en el backend: " +
            "GET /channels/meta/embedded-signup/config debe registrarse ANTES que GET /channels/:id, " +
            "que lleva ParseUUIDPipe.",
        );
        return null;
      }
    }
    throw error;
  }
}

/**
 * Canjea el `code` del popup y deja el canal conectado.
 *
 * El `code` vive **30 segundos** y es de un solo uso, así que esta llamada sale
 * inmediatamente, sin confirmación intermedia. Un fallo NUNCA se reintenta con el
 * mismo `code`: siempre se reabre `FB.login`.
 */
export function completeMetaSignup(payload: MetaEmbeddedSignupDTO): Promise<ChannelDTO> {
  return http.post<ChannelDTO>("/channels/meta/embedded-signup", payload);
}

/**
 * Registra el número en Cloud API con el PIN de seis dígitos.
 *
 * Es la salida del 409 `channels/meta_registration_required`: el número ya estaba
 * dado de alta en Meta y hace falta el PIN que se definió entonces. Lo teclea el
 * usuario; no existe un PIN de plataforma compartido.
 */
export function registerMetaPhoneNumber(
  channelId: string,
  registerPin: string,
): Promise<ChannelDTO> {
  return http.post<ChannelDTO>(`/channels/${channelId}/meta/register`, {
    register_pin: registerPin,
  });
}

/**
 * Paso 1 del alta por páginas (F7): canjea el `code` y devuelve los activos que
 * el negocio autorizó. Es `POST` y no `GET` porque consume el code —de un solo
 * uso— y crea la sesión en el servidor.
 */
export function listMetaPageAssets(payload: {
  code: string;
  product: "instagram" | "messenger";
}): Promise<Schemas["MetaPageAssetsDto"]> {
  return http.post<Schemas["MetaPageAssetsDto"]>("/channels/meta/page-signup/assets", payload);
}

/** Paso 2: conecta el activo elegido. El `asset_id` se valida contra la sesión. */
export function connectMetaPageChannel(payload: {
  session_id: string;
  asset_id: string;
  name?: string;
}): Promise<ChannelDTO> {
  return http.post<ChannelDTO>("/channels/meta/page-signup", payload);
}
