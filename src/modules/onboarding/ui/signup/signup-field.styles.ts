import { Blocks, Building2, KeyRound, MapPin, UserRound, type LucideIcon } from "lucide-react";

import type { SignupStep } from "@/modules/onboarding/domain/signup-draft";

/**
 * El recetario de los controles vive en `ui/flow/flow.styles.ts` (lo comparten
 * el registro y el onboarding); aquí quedan los nombres con los que el registro
 * lo consume y el diccionario de iconos de sus paradas.
 */
export {
  FLOW_INPUT_CLASS as SIGNUP_INPUT_CLASS,
  FLOW_SELECT_CLASS as SIGNUP_SELECT_CLASS,
  SrLabel,
} from "@/modules/onboarding/ui/flow/flow.styles";

/** Icono de cada parada de la ruta. Diccionario cerrado: Tailwind y el bundle lo exigen. */
export const SIGNUP_STEP_ICONS: Record<SignupStep, LucideIcon> = {
  offer: Blocks,
  company: Building2,
  location: MapPin,
  owner: UserRound,
  account: KeyRound,
};
