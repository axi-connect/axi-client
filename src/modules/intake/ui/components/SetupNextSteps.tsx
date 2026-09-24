"use client";

import type { ComponentType } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Hand,
  MessageCircle,
  Package,
  PenLine,
  Route,
  Store,
  Zap,
} from "lucide-react";

import { formatInteger } from "@/core/lib/commercial-units";
import { formatMillions, formatMoney } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import type { ActivationStep, IntakeGoalSummary, IntakeSummary } from "@/modules/intake/domain/intake";

/**
 * Lo que queda listo, lo que pone la persona y lo que le falta, bajo el cierre
 * (mockup aprobado por el dueño: `docs/design/mockups/alba-closing-summary.html`).
 *
 * Tres grupos (cuatro con la meta del mes), cada uno la misma lista agrupada
 * de la ficha —etiqueta → valor, una línea secundaria, un solo indicador— y
 * **sin botones en las filas**: la persona no tiene sesión en el panel y el
 * «dónde» es orientación, no navegación. El copy viene del servidor en la
 * misma respuesta que el cierre (la meta llega en cifras y aquí se dice); aquí
 * solo se decide el orden de los grupos y el color de cada uno. Un grupo vacío
 * no se pinta.
 *
 * Es la otra mitad de N2: el cierre dejó de decir «queda configurada de punta
 * a punta» y esto es lo que lo sustituye — la verdad, en tres listas.
 */
export function SetupNextSteps({ summary, className }: { summary: IntakeSummary; className?: string }) {
  const groups = [
    axiGroup(summary),
    summary.goal == null ? null : goalGroup(summary.goal),
    summary.you_do.length === 0 ? null : (
      <Group key="you" tone="you" icon={Hand} title="Lo pones tú">
        {summary.you_do.map((item) => (
          <Row key={`${item.label}-${item.where}`} tone="you" icon={PenLine} label={item.label} value={item.value}>
            Ponlo en <b className="font-semibold text-foreground/70">{item.where}</b>
          </Row>
        ))}
      </Group>
    ),
    summary.to_activate.length === 0 ? null : (
      <Group key="act" tone="act" icon={Zap} title="Para que atienda de verdad">
        {summary.to_activate.map((item) => (
          <Row key={item.step} tone="act" icon={STEP_ICONS[item.step]} value={item.label} trailing={item.where} />
        ))}
      </Group>
    ),
  ].filter((group) => group !== null);

  if (groups.length === 0) return null;
  return (
    <div className={cn("flex w-full max-w-[480px] flex-col gap-[18px] text-left", className)} data-testid="next-steps">
      {groups}
    </div>
  );
}

function axiGroup(summary: IntakeSummary) {
  if (summary.axi_applies === 0) return null;
  const n = summary.axi_applies;
  const value = summary.applied
    ? n === 1
      ? "1 dato aplicado"
      : `${String(n)} datos aplicados`
    : n === 1
      ? "1 dato de tu negocio"
      : `${String(n)} datos de tu negocio`;
  return (
    <Group key="axi" tone="ok" icon={Check} title={summary.applied ? "Ya está en tu cuenta" : "Lo deja aplicado axi"}>
      <Row tone="ok" icon={Check} value={value}>
        {summary.applied
          ? "Los revisó el equipo de axi y ya están en tu configuración."
          : "El equipo de axi los revisa y los aplica en tu cuenta."}
      </Row>
    </Group>
  );
}

/**
 * La meta del mes (método comercial F7), antes de «Lo pones tú»: cuánto quiere
 * vender, qué implica y contra qué se compara. Coral porque habla el progreso
 * (el icono; el texto no, que en coral no pasa AA). Sin cifras inventadas: la
 * fila que el servidor no trae no se pinta, y una meta por debajo del mes
 * pasado no se dice como porcentaje negativo.
 */
function goalGroup(goal: IntakeGoalSummary) {
  const { currency } = goal;
  const sales =
    goal.needed_sales === null
      ? null
      : `${formatInteger(goal.needed_sales)}${goal.avg_ticket_cents === null ? "" : ` · ticket ${formatMoney(goal.avg_ticket_cents, currency)}`}`;
  const before =
    goal.last_month_revenue_cents === null
      ? null
      : `${formatMillions(goal.last_month_revenue_cents, currency)} el mes pasado${goal.delta_pct !== null && goal.delta_pct > 0 ? ` · +${String(goal.delta_pct)} %` : ""}`;
  return (
    <Group key="goal" tone="goal" icon={Route} title="Tu meta del mes">
      <Row tone="goal" icon={Route} label={`Tu meta de ${goal.month_label}`} value={formatMillions(goal.target_cents, currency)} />
      {sales === null ? null : <Row tone="goal" icon={Route} label="Ventas necesarias" value={sales} />}
      {before === null ? null : <Row tone="goal" icon={Route} label="Antes" value={before} />}
    </Group>
  );
}

type Tone = "ok" | "goal" | "you" | "act";
type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

const STEP_ICONS: Record<ActivationStep, Icon> = {
  whatsapp: MessageCircle,
  channel_agent: Bot,
  catalog: Package,
  agents: Bot,
  business_hours: Clock3,
  niche: Store,
};

const EYEBROW: Record<Tone, string> = {
  ok: "text-success",
  goal: "text-muted-foreground [&>svg]:text-brand",
  you: "text-muted-foreground",
  act: "text-accent-amber",
};

const INDICATOR: Record<Tone, string> = {
  ok: "bg-success/[0.14] text-success",
  goal: "bg-brand/[0.12] text-brand",
  you: "bg-accent-violet/[0.12] text-accent-violet",
  act: "bg-accent-amber/[0.16] text-accent-amber",
};

function Group({
  tone,
  icon: IconComponent,
  title,
  children,
}: {
  tone: Tone;
  icon: Icon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h3
        className={cn(
          "mb-2 ml-4 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.05em] uppercase",
          EYEBROW[tone],
        )}
      >
        <IconComponent className="size-3" aria-hidden="true" />
        {title}
      </h3>
      <ul className="grouped-list shadow-float">{children}</ul>
    </section>
  );
}

function Row({
  tone,
  icon: IconComponent,
  label,
  value,
  trailing,
  children,
}: {
  tone: Tone;
  icon: Icon;
  label?: string;
  value: string;
  /** El «dónde» de un paso pendiente: orienta, no navega. */
  trailing?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="grouped-row">
      <div className="flex min-h-[52px] items-center gap-3 px-4 py-[11px]">
        <span className={cn("flex size-[26px] flex-none items-center justify-center rounded-full", INDICATOR[tone])}>
          <IconComponent className="size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          {label === undefined ? null : <span className="block text-[12px] text-muted-foreground">{label}</span>}
          <span className="mt-0.5 block text-[15px] leading-[1.4] tracking-[-0.005em] wrap-anywhere">{value}</span>
          {children === undefined ? null : (
            <span className="mt-[3px] block text-[11.5px] text-muted-foreground">{children}</span>
          )}
        </span>
        {trailing === undefined ? null : (
          <span className="inline-flex flex-none items-center gap-0.5 text-[12.5px] font-semibold text-muted-foreground">
            {trailing}
            <ChevronRight className="size-[13px]" aria-hidden="true" />
          </span>
        )}
      </div>
    </li>
  );
}
