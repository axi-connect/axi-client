import type { WelcomeKitData } from "@/modules/welcome-kit/domain/welcome-kit";
import { welcomeKitFromWire } from "@/modules/welcome-kit/infrastructure/welcome-kit.mapper";
import type { WelcomeKitPreviewWire } from "./delivery.dto";

/**
 * `kit_data` de la vista previa → los datos que pinta el kit web, para la
 * pestaña «Kit» de «Preparar entrega». Es el mismo mapeo de la página pública
 * del kit: la vista previa enseña exactamente lo que verá el dueño.
 */
export function kitDataFromPreview(kit: WelcomeKitPreviewWire): WelcomeKitData {
  return welcomeKitFromWire(kit);
}
