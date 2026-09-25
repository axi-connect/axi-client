import type { Schemas } from "@/core/api/types";

/**
 * `GET /public/welcome/:token` (slice `delivery` del servidor). Nunca lleva el
 * enlace de contraseña ni el token del kit (`password_reset_url` es la página
 * pública de «¿Olvidaste tu contraseña?»).
 */
export type WelcomeKitDataWire = Schemas["WelcomeKitDataDto"];

/**
 * Lo que necesita el kit para pintarse: el DTO público sin su vencimiento.
 * Es también el `kit_data` de la vista previa de «Preparar entrega».
 */
export type WelcomeKitSource = Omit<WelcomeKitDataWire, "kit_expires_at">;
