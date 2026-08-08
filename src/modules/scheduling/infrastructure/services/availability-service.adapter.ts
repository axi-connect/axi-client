import { http } from "@/core/services/http";
import type { Params } from "@/core/services/http";
import type {
  AvailabilityDTO,
  AvailabilityParams,
} from "@/modules/scheduling/domain/availability";

/** Grilla de disponibilidad sugerida (`GET /scheduling/availability`). */
export function getAvailability(params: AvailabilityParams): Promise<AvailabilityDTO> {
  return http.get<AvailabilityDTO>("/scheduling/availability", params as Params);
}
