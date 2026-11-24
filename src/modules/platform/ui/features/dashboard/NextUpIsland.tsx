"use client";

/**
 * La isla «Lo próximo» del Inicio (rediseño F1): lo que pide atención hoy.
 * - Alertas disparadas (el contador del menú).
 * - Pruebas que vencen esta semana (de `trial_ends_at`, que la lista ya trae).
 * - Entrevistas de puesta en marcha que piden atención (`needsAttention`).
 * Si una de las tres lecturas falla, se dice (error ≠ vacío): nunca se da por
 * hecho que «no hay nada».
 */
import Link from "next/link";
import { CalendarClock, CircleCheck, MessageCircleHeart, TriangleAlert, type LucideIcon } from "lucide-react";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { joinNames, trialEndsPhrase, type TrialEnding } from "../../../domain/dashboard";
import { ALERT_RULE_LABELS, humanLabel } from "../../../domain/labels";
import type { PlatformAlert } from "../../../domain/analytics";

type NextItem = { key: string; icon: LucideIcon; title: string; detail: string; href: string; cta: string };

const COUNT_WORDS = ["Nada", "Una cosa", "Dos cosas", "Tres cosas", "Cuatro cosas"];

export function nextUpTitle(count: number): string {
  if (count === 0) return "Nada pide tu atención hoy";
  const words = COUNT_WORDS[count] ?? `${String(count)} cosas`;
  return `${words} ${count === 1 ? "pide" : "piden"} tu atención hoy`;
}

function alertsItem(count: number | undefined, failed: boolean, alerts: readonly PlatformAlert[]): NextItem | null {
  if (failed && count === undefined) {
    return {
      key: "alerts",
      icon: TriangleAlert,
      title: "No pudimos contar las alertas",
      detail: "Ábrelas para ver si hay alguna disparada.",
      href: "/platform/analytics",
      cta: "Ver alertas",
    };
  }
  if (!count) return null;
  const first = alerts[0];
  const others = count - 1;
  const detail = first
    ? `${humanLabel(ALERT_RULE_LABELS, first.rule).label} en ${first.company_name ?? "una empresa"}${others > 0 ? (others === 1 ? " y una más" : ` y ${String(others)} más`) : ""}`
    : "Revisa qué agente o empresa las disparó.";
  return {
    key: "alerts",
    icon: TriangleAlert,
    title: count === 1 ? "1 alerta disparada" : `${String(count)} alertas disparadas`,
    detail,
    href: "/platform/analytics",
    cta: "Ver alertas",
  };
}

function trialsItem(trials: readonly TrialEnding[]): NextItem | null {
  if (trials.length === 0) return null;
  const [first, ...rest] = trials;
  const names = [`${first!.tenant.name} (${trialEndsPhrase(first!.daysLeft).replace(/^vence /, "")})`, ...rest.map((t) => t.tenant.name)];
  return {
    key: "trials",
    icon: CalendarClock,
    title: trials.length === 1 ? "1 prueba vence esta semana" : `${String(trials.length)} pruebas vencen esta semana`,
    detail: joinNames(names),
    href: "/platform/tenants",
    cta: "Ver empresas",
  };
}

function intakeItem(count: number | undefined, failed: boolean): NextItem | null {
  if (failed && count === undefined) {
    return {
      key: "intake",
      icon: MessageCircleHeart,
      title: "No pudimos leer las entrevistas",
      detail: "Ábrelas para ver si alguna espera.",
      href: "/platform/intake",
      cta: "Abrir",
    };
  }
  if (!count) return null;
  return {
    key: "intake",
    icon: MessageCircleHeart,
    title:
      count === 1
        ? "1 entrevista de puesta en marcha pide atención"
        : `${String(count)} entrevistas de puesta en marcha piden atención`,
    detail: "Terminadas sin aplicar o paradas hace días",
    href: "/platform/intake",
    cta: "Abrir",
  };
}

export function NextUpIsland({
  alertsCount,
  alertsFailed,
  alerts,
  trials,
  intakeAttention,
  intakeFailed,
}: {
  alertsCount: number | undefined;
  alertsFailed: boolean;
  alerts: readonly PlatformAlert[];
  trials: readonly TrialEnding[];
  intakeAttention: number | undefined;
  intakeFailed: boolean;
}) {
  const items = [
    alertsItem(alertsCount, alertsFailed, alerts),
    trialsItem(trials),
    intakeItem(intakeAttention, intakeFailed),
  ].filter((item): item is NextItem => item !== null);
  const pending = items.filter((item) => !item.title.startsWith("No pudimos")).length;

  return (
    <InkIsland label="Lo próximo" className="gap-3 rounded-3xl p-6 sm:p-7">
      <Kicker>Lo próximo</Kicker>
      <h2 className="font-heading text-[22px] leading-tight font-bold sm:text-2xl">
        {pending === 0 && items.length > 0 ? "Revisa lo que no pudimos leer" : nextUpTitle(pending)}
      </h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2.5 text-sm opacity-80">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          Ninguna alerta disparada, ninguna prueba vence esta semana y ninguna entrevista espera.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={item.key}
              className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-current/10 py-3 first:border-t-0 first:pt-1 sm:grid-cols-[20px_minmax(0,1fr)_auto]"
            >
              <item.icon aria-hidden="true" className="size-4 self-start opacity-70 sm:self-center" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm text-pretty">{item.title}</span>
                <span className="text-xs text-pretty opacity-70">{item.detail}</span>
              </span>
              <Button asChild variant="glass" size="sm" className="col-start-2 justify-self-start sm:col-start-3">
                <Link href={item.href}>{item.cta}</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </InkIsland>
  );
}
