/**
 * Dominio de analytics cross-tenant (triage de agentes + alertas de
 * plataforma). TypeScript PURO. `degraded: true` = alguna DB dedicada no
 * respondió al fan-out → VISTA PARCIAL, nunca error (spec D7).
 * Las alertas son 100% read-only (no existe endpoint de mutación).
 */
import type { Schemas } from "@/core/api/types";

export type AgentsHealth = Schemas["AgentsHealthDto"];
export type AgentHealth = AgentsHealth["agents"][number];
export type AlertsByCompany = AgentsHealth["alerts_by_company"][number];
export type PlatformAlert = Schemas["PlatformAlertsDto"]["data"][number];

/** Periodos del selector del triage (query `days`, default 7). */
export const ANALYTICS_PERIODS = [1, 7, 30, 90] as const;
export const DEFAULT_ANALYTICS_PERIOD = 7;

export type AlertStatus = "triggered" | "acknowledged" | "resolved";

export const ALERT_STATUSES: { value: AlertStatus; label: string }[] = [
  { value: "triggered", label: "Disparadas" },
  { value: "acknowledged", label: "Reconocidas" },
  { value: "resolved", label: "Resueltas" },
];
