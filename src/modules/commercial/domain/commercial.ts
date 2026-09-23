import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice `commercial` (la meta del mes, el plan y el ritmo),
 * derivados del contrato del backend (`core/api/schema.d.ts`, generado desde
 * el `openapi.json` del servidor). En `snake_case`, 1:1 con el wire. Dinero en
 * centavos enteros; fechas de periodo `YYYY-MM-DD` en la zona horaria del
 * tenant; tasas como fracción 0–1.
 */

/** `GET /commercial/goal` (200 siempre: `goal: null` es «sin meta», no 404). */
export type GoalResponseWireDTO = Schemas["GoalResponseDto"];
export type CommercialGoalDTO = NonNullable<GoalResponseWireDTO["goal"]>;
/** La semilla para proponer una meta: la historia si la hay, si no el nicho. */
export type GoalSeedDTO = GoalResponseWireDTO["seed"];
/**
 * La meta tal como la guarda el cliente: `seed` es `null` solo cuando la meta
 * se guardó sin haber cargado antes `GET /commercial/goal` (no se inventa).
 */
export interface GoalResponseDTO {
  goal: CommercialGoalDTO | null;
  seed: GoalSeedDTO | null;
}
/** `PUT /commercial/goal`. Lo que se edita en «Ajustar supuestos» pasa a «lo dijiste tú». */
export type GoalInputDTO = Schemas["GoalInputDto"];
export type GoalSource = CommercialGoalDTO["source"];

/** `GET /commercial/plan` (o `null` sin meta) y `GET /commercial/plan/preview?target_cents=`. */
export type CommercialPlanDTO = Schemas["PlanDto"];
export type PlanInputsDTO = CommercialPlanDTO["inputs"];
export type PlanRateDTO = NonNullable<PlanInputsDTO["quote_to_sale"]>;
export type PlanFiguresDTO = CommercialPlanDTO["figures"];
/** Una cifra con su procedencia y la base que la explica («history_90d n=61»). */
export type FigureDTO = PlanFiguresDTO["needed_sales"];
export type PlanPacingDTO = CommercialPlanDTO["pacing"];
export type ProductMixRowDTO = CommercialPlanDTO["product_mix"][number];
/** `incomplete` = falta el ticket promedio: las cifras llegan en 0 con `basis: "incomplete"`. */
export type PlanStatus = CommercialPlanDTO["status"];

/**
 * `GET /commercial/pace?granularity=day|week`. Nunca calcula en caliente: lee
 * rollup + plan. Sin meta responde 404 `commercial/goal_not_found`: el store
 * solo lo pide cuando hay meta.
 */
export type CommercialPaceDTO = Schemas["PaceDto"];
export type PaceKeyResultDTO = CommercialPaceDTO["key_results"][number];
/**
 * Un punto de la serie del mes. **Las cifras son ACUMULADAS** desde el primer
 * día del periodo (`sales += orders_paid` día a día), no el valor del día: el
 * valor de una semana es el último punto de la semana menos el último punto
 * anterior a su lunes.
 */
export type PacePointDTO = CommercialPaceDTO["series"][number];
export type PaceGranularity = CommercialPaceDTO["granularity"];
export type DataSufficiency = CommercialPaceDTO["data_sufficiency"];

/** De dónde sale una cifra. Cada número del módulo lleva la suya (D7). */
export type SourceKind = FigureDTO["source"];
/** El ritmo contra la meta (`commercial/domain/pacing.ts` del servidor). */
export type PaceStatus = CommercialPaceDTO["status"];
/** Los resultados clave derivados de la meta (D8), en el orden de la lista. */
export type KeyResultKey = PaceKeyResultDTO["key"];

/**
 * Una acción que Axi propone para acelerar la ruta. F6: sustituir por el
 * `Schemas[...]` de `GET /commercial/proposals` cuando exista; en F3 solo
 * tipa la prop de `ActionList`, que se monta sin propuestas.
 */
export interface CommercialProposalDTO {
  id: string;
  title: string;
  headline: string | null;
  rationale: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string | null;
  created_at: string;
}
