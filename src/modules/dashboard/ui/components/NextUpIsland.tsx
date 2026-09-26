"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Check, ChevronRight, LoaderCircle, Pause, Sparkle, Unplug } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatInteger } from "@/core/lib/commercial-units";
import { useOnboardingResume, type OnboardingResume } from "@/modules/onboarding/public";
import {
  NEXT_UP_ROUTES,
  aiStatusLine,
  nextUpActions,
  nextUpHeadline,
  nextUpItems,
  unreadSourcesPhrase,
  type NextUpItem,
  type NextUpSource,
} from "@/modules/dashboard/domain/next-up";
import type { DashboardPerms, Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { channelKindLabel, type ChannelHealth } from "@/modules/dashboard/domain/health";
import type { InboxCountsDTO, OrderStatsDTO, UsageSummaryDTO } from "@/modules/dashboard/domain/dashboard";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Una sección que decide la isla sigue sin respuesta: la isla espera en vez de cambiar después. */
function pending(allowed: boolean, section: Section<unknown>): boolean {
  return allowed && section.data === null && (section.status === "idle" || section.status === "loading");
}

const DOT = { destructive: "bg-destructive", warning: "bg-warning" } as const;
// `flex-auto` + `flex-wrap` en la fila: «Reconectar Instagram» y «Ver el plan» no caben juntos a 390 px.
const ACTION_CLASS = "h-11 flex-auto rounded-full px-5";

/**
 * «Lo próximo»: la ÚNICA isla del Panel (DESIGN-SYSTEM §9.5.1, cristal blanco
 * por defecto). Lo accionable, en orden de gravedad (`domain/next-up.ts`); el
 * primer día, los pasos de la configuración (los decide `onboarding`); sin
 * nada pendiente, lo dice con calma. Mientras carga un dato que la decide
 * pinta su silueta: mostrar una isla y cambiarla por otra es peor que esperar.
 */
export function NextUpIsland({
  perms,
  attention,
  sales,
  channels,
  usage,
  onRetry,
  className,
}: {
  perms: DashboardPerms;
  attention: Section<InboxCountsDTO>;
  sales: Section<OrderStatsDTO>;
  channels: Section<ChannelHealth[]>;
  usage: Section<UsageSummaryDTO>;
  /** Vuelve a pedir las fuentes que fallaron. */
  onRetry: (failed: NextUpSource[]) => Promise<void>;
  className?: string;
}) {
  const onboarding = useOnboardingResume();

  const loading =
    onboarding.state === "loading" ||
    pending(perms.conversations, attention) ||
    pending(perms.orders, sales) ||
    pending(perms.channels, channels) ||
    pending(perms.usage, usage);

  if (loading) {
    return (
      <InkIsland label="Lo próximo" className={cn("gap-4", className)}>
        <div role="status" aria-label="Cargando lo próximo" className="flex flex-col gap-4">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-7 w-52 rounded-lg" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3.5">
              <Skeleton className="h-8 w-9 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-5/6 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </InkIsland>
    );
  }

  const items = nextUpItems({
    attention: attention.data,
    sales: sales.data,
    channels: channels.data,
    usage: usage.data,
    kindLabel: channelKindLabel,
  });
  const urgent = items.some((item) => item.tone === "destructive");
  const failed = (
    [
      ["attention", perms.conversations, attention],
      ["sales", perms.orders, sales],
      ["channels", perms.channels, channels],
      ["usage", perms.usage, usage],
    ] as const
  )
    .filter(([, allowed, section]) => allowed && section.status === "error")
    .map(([source]) => source as NextUpSource);
  const retry = () => onRetry(failed);

  if (onboarding.state === "pending" && !urgent) {
    return <OnboardingIsland resume={onboarding} className={className} />;
  }

  const aiLine = aiStatusLine(attention.data, usage.data);

  // Sin filas pero con una fuente que no se leyó: no se sabe si todo está al día.
  if (items.length === 0 && failed.length > 0) {
    return (
      <InkIsland label="Lo próximo" className={cn("gap-2.5", className)}>
        <Kicker>Lo próximo</Kicker>
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance">No pudimos revisar lo pendiente</h2>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          No pudimos leer {unreadSourcesPhrase(failed)}. Hasta leerlo no damos por hecho que todo está al día.
        </p>
        <div className="min-h-3 flex-1" />
        <RetryButton onRetry={retry} variant="contrast" />
      </InkIsland>
    );
  }

  if (items.length === 0) {
    return (
      <InkIsland label="Lo próximo" glow="ai" className={cn("gap-2.5", className)}>
        <Kicker>Lo próximo</Kicker>
        <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight">Todo al día</h2>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {calmSentence(perms, aiLine)}
        </p>
        <div className="min-h-3 flex-1" />
        {perms.conversations ? (
          <Button asChild variant="glass" className="h-11 w-fit px-5">
            <Link href={NEXT_UP_ROUTES.inbox}>Ver conversaciones</Link>
          </Button>
        ) : null}
      </InkIsland>
    );
  }

  const actions = nextUpActions(items);
  return (
    <InkIsland label="Lo próximo" className={cn("gap-1.5", className)}>
      <Kicker>Lo próximo</Kicker>
      <h2 className="font-heading mb-1 text-2xl leading-tight font-bold tracking-tight">{nextUpHeadline(items)}</h2>
      <ul className="divide-border divide-y">
        {items.slice(0, 4).map((item) => (
          <li key={item.key}>
            <NextUpRow item={item} />
          </li>
        ))}
      </ul>
      {failed.length > 0 ? (
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
            No pudimos leer {unreadSourcesPhrase(failed)}.
          </span>
          <RetryButton onRetry={retry} variant="glass" size="sm" />
        </div>
      ) : null}
      <div className="min-h-3 flex-1" />
      {aiLine ? (
        <p className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
          <Sparkle aria-hidden="true" className="text-accent-violet size-3.5 shrink-0 fill-current" />
          {aiLine}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        {actions.map((action, index) => (
          <Button key={action.href} asChild variant={index === 0 ? "contrast" : "glass"} className={ACTION_CLASS}>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>
    </InkIsland>
  );
}

/** «Reintentar» con su estado de espera; vuelve a pedir solo lo que falló. */
function RetryButton({
  onRetry,
  variant,
  size,
}: {
  onRetry: () => Promise<void>;
  variant: "contrast" | "glass";
  size?: "sm";
}) {
  const [retrying, setRetrying] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("w-fit rounded-full", size === "sm" ? "h-8 px-3.5" : "h-11 px-5")}
      disabled={retrying}
      onClick={() => {
        setRetrying(true);
        void onRetry().finally(() => setRetrying(false));
      }}
    >
      {retrying ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
      Reintentar
    </Button>
  );
}

function calmSentence(perms: DashboardPerms, aiLine: string | null): string {
  const quiet = perms.orders ? "Nadie espera en cola y no hay pagos por verificar." : "Nadie espera en cola.";
  if (!perms.conversations) return perms.orders ? "No hay pagos por verificar. Si algo te necesita, aparece aquí." : "Si algo te necesita, aparece aquí.";
  return aiLine ? `${quiet} ${aiLine}; si alguna te necesita, aparece aquí.` : `${quiet} Si algo te necesita, aparece aquí.`;
}

function NextUpRow({ item }: { item: NextUpItem }) {
  const Icon = item.icon === "channel" ? Unplug : Pause;
  return (
    <Link
      href={item.href}
      className="-mx-1.5 flex min-h-11 items-center gap-3.5 rounded-xl px-1.5 py-3.5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50"
    >
      {item.count !== null ? (
        <span className="font-heading min-w-10 shrink-0 text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums">
          {formatInteger(item.count)}
        </span>
      ) : (
        <span aria-hidden="true" className="bg-foreground/6 relative flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-4.5" />
          {item.tone !== "neutral" ? (
            <span className={cn("ring-background absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2", DOT[item.tone])} />
          ) : null}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.9rem] font-semibold whitespace-nowrap">{item.title}</span>
        <span className="text-muted-foreground truncate text-xs" title={item.detail}>
          {item.detail}
        </span>
      </span>
      {item.count !== null && item.tone !== "neutral" ? (
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[item.tone])} />
      ) : (
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 opacity-50" />
      )}
    </Link>
  );
}

/** El primer día: lo más accionable es terminar de configurar. */
function OnboardingIsland({
  resume,
  className,
}: {
  resume: Extract<OnboardingResume, { state: "pending" }>;
  className?: string;
}) {
  return (
    <InkIsland label="Empieza por aquí" className={cn("gap-1.5", className)}>
      <Kicker>Empieza por aquí</Kicker>
      <h2 className="font-heading mb-1 text-2xl leading-tight font-bold tracking-tight">
        {resume.pending === 1 ? "Te falta 1 paso" : `Te faltan ${String(resume.pending)} pasos`}
      </h2>
      <p className="text-muted-foreground mb-2 text-xs">Para que tu agente empiece a atender y vender.</p>
      <ol className="divide-border divide-y">
        {resume.steps.map((step, index) => {
          const closed = step.status !== "pending";
          const current = step.code === resume.next?.code;
          return (
            <li key={step.code} className="flex min-h-11 items-center gap-3.5 py-2.5" aria-current={current ? "step" : undefined}>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  closed && "bg-foreground text-background",
                  current && "ring-brand ring-2 ring-inset",
                  !closed && !current && "text-muted-foreground ring-border ring-1 ring-inset",
                )}
              >
                {closed ? <Check className="size-3.5" strokeWidth={2.6} /> : index + 1}
              </span>
              <span className={cn("flex-1 truncate text-sm", closed ? "text-muted-foreground" : "font-semibold")}>{step.label}</span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {step.status === "done" ? "Hecho" : step.status === "skipped" ? "Omitido" : current ? "Sigue" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="min-h-3 flex-1" />
      <div className="flex flex-wrap gap-2.5">
        <Button asChild variant="contrast" className={ACTION_CLASS}>
          <Link href={resume.href}>Continuar</Link>
        </Button>
        <Button variant="glass" className="h-11 px-5" onClick={resume.dismiss}>
          Ocultar
        </Button>
      </div>
    </InkIsland>
  );
}
