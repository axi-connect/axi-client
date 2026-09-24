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

/**
 * `GET /commercial/pace?granularity=day|week`. Nunca calcula en caliente: lee
 * rollup + plan. Sin meta responde 404 `commercial/goal_not_found`: el store
 * solo lo pide cuando hay meta. Los puntos de `series` son ACUMULADOS desde el
 * primer día del periodo, no el valor del día.
 */
export type CommercialPaceDTO = Schemas["PaceDto"];
export type PaceKeyResultDTO = CommercialPaceDTO["key_results"][number];
export type PaceGranularity = CommercialPaceDTO["granularity"];

/** De dónde sale una cifra. Cada número del módulo lleva la suya (D7). */
export type SourceKind = FigureDTO["source"];
/** El ritmo contra la meta (`commercial/domain/pacing.ts` del servidor). */
export type PaceStatus = CommercialPaceDTO["status"];
/** Los resultados clave derivados de la meta (D8), en el orden de la lista. */
export type KeyResultKey = PaceKeyResultDTO["key"];

/*
 * ---------------------------------------------------------------- propuestas
 *
 * «Axi propone» (F6): `GET /commercial/proposals`, `GET /commercial/proposals/:id`,
 * `POST …/approve` y `POST …/reject`. Lo sirve un controller de cmo (el dueño
 * de `cmo_proposal`) con los DTOs de `cmo/presentation/dto/cmo.dto.ts`.
 */

export type CommercialProposalListDTO = Schemas["CommercialProposalListDto"];
export type CommercialProposalDetailDTO = Schemas["CommercialProposalDetailDto"];
/**
 * Una acción que Axi propone para acelerar la ruta: la misma fila de
 * `cmo_proposal` que ve Axel, más la cuenta del método comercial
 * (`target_key_result`, `estimated_sales`, `covers_pct`, `basis`), que viaja en
 * `null` cuando la fila no la trae. `artifacts` es abierto: se lee con
 * `readOutreach` (`domain/proposals.ts`).
 */
export type CommercialProposalDTO = CommercialProposalListDTO["data"][number];
export type CommercialProposalStatus = CommercialProposalDTO["status"];
/** Lo aplicado y lo fallido por separado; `applied[].detail` es el parcial en palabras. */
export type CommercialApprovalResultDTO = Schemas["ApprovalResultDto"];
export type RejectCommercialProposalDTO = Schemas["RejectProposalDto"];
export type RejectCommercialProposalResultDTO = Schemas["RejectResultDto"];
