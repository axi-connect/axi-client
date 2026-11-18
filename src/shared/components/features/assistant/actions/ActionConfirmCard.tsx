"use client";

import { memo, useId, useState } from "react";
import {
  ArrowRight,
  Ban,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Layers,
  LoaderCircle,
  PencilLine,
  Plug,
  Send,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  actionPhaseDot,
  actionPhaseLabel,
  changesLabel,
  confirmVerb,
  visiblePhase,
  type ActionPhase,
  type ActionPreviewLine,
  type AssistantActionView,
} from "./action-view";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

interface ActionConfirmCardProps {
  /** Las acciones de UN turno de Axel. Con más de una, la tarjeta se agrupa. */
  actions: readonly AssistantActionView[];
  /** El turno acaba de llegar en esta sesión: entrada y anillo, como la propuesta. */
  fresh?: boolean;
  /** Axel no está disponible: la tarjeta se lee pero no se decide. */
  disabled?: boolean;
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  /** «Confirmar todo»: recibe solo las R1 pendientes. Puede devolver la promesa de la serie. */
  onConfirmAll: (actionIds: string[]) => void | Promise<void>;
  /** Reloj inyectable para las pruebas; por defecto, el del montaje. */
  now?: number;
  /** Quién las preparó, para la tarjeta agrupada («Axel dejó 3 cambios listos»). */
  author?: string;
}

/**
 * La tarjeta con la que la persona confirma o descarta lo que Axel dejó
 * preparado (F3 «Axel OS», plan §4 del servidor).
 *
 * Mismo lenguaje que `ProposalCard` —las fichas de /comercial—: monocroma, el
 * tipo en un cuadro de tinta, el antetítulo pequeño con el estado en su punto y
 * dos botones, el fuerte en tinta (`contrast`) y el secundario de cristal.
 *
 * Los dos niveles de riesgo se distinguen en lo que importa:
 *
 *  - **R1 (`write`)**: interno y reversible. Un toque: «Confirmar».
 *  - **R2 (`external`)**: llega al cliente final, cuesta o no se deshace. El
 *    botón dice «Aprobar», el riesgo se dice con palabras ANTES del botón
 *    (y el botón lo referencia con `aria-describedby`), y nunca entra en
 *    «Confirmar todo»: cada una se aprueba mirándola.
 *
 * Nada se marca hecho hasta que el servidor responde: mientras va, el botón
 * dice «Confirmando…» y los dos quedan deshabilitados. El resultado se anuncia
 * en una región viva que existe desde el montaje (una región que nace con su
 * texto no se lee).
 */
export const ActionConfirmCard = memo(function ActionConfirmCard({
  actions,
  fresh = false,
  disabled = false,
  onConfirm,
  onReject,
  onConfirmAll,
  now,
  author = "Axel",
}: ActionConfirmCardProps) {
  /* El reloj se toma UNA vez al montar: la tarjeta no tiene por qué repintarse
     sola para vencer, y si alguien toca un botón vencido el servidor responde
     `expired` y la tarjeta lo dice igual. */
  const [mountedAt] = useState(() => Date.now());
  const clock = now ?? mountedAt;
  const [sweeping, setSweeping] = useState(false);

  const phases = actions.map((action) => visiblePhase(action, clock));
  const anyPending = phases.some((phase) => phase === "pending");

  if (actions.length === 0) return null;

  const single = actions.length === 1 ? actions[0] : undefined;
  if (single !== undefined) {
    return (
      <article
        aria-label={single.summary}
        aria-busy={single.busy !== null}
        className={cn(
          "axel-comet-card glass-overlay flex flex-col gap-4 rounded-3xl p-5",
          fresh && anyPending && "axel-comet-card--new",
        )}
      >
        <ActionBody action={single} phase={phases[0] ?? single.phase} disabled={disabled} onConfirm={onConfirm} onReject={onReject} />
      </article>
    );
  }

  /* «Confirmar todo» solo junta las R1 pendientes y libres. Las R2 se aprueban
     una a una; si las hay, el botón lo dice («los 2 internos») para que nadie
     crea que también aprobó lo que sale hacia sus clientes. */
  const sweepable = actions.filter(
    (action, index) => action.risk === "write" && action.busy === null && phases[index] === "pending",
  );
  const externalPending = actions.some((action, index) => action.risk === "external" && phases[index] === "pending");
  const pendingCount = phases.filter((phase) => phase === "pending").length;
  const showSweep = sweepable.length >= 2 || sweeping;
  const sweepLabel = externalPending ? `Confirmar los ${String(sweepable.length)} internos` : "Confirmar todo";

  const sweep = () => {
    setSweeping(true);
    void Promise.resolve(onConfirmAll(sweepable.map((action) => action.id))).finally(() => {
      setSweeping(false);
    });
  };

  return (
    <section
      aria-label={`${changesLabel(actions.length)} preparados por ${author}`}
      aria-busy={actions.some((action) => action.busy !== null)}
      className={cn(
        "axel-comet-card glass-overlay flex flex-col gap-4 rounded-3xl p-5",
        fresh && anyPending && "axel-comet-card--new",
      )}
    >
      <div className="flex items-start gap-3.5">
        <Tile icon={Layers} muted={!anyPending} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Kicker
            label={changesLabel(actions.length)}
            state={
              pendingCount === 0
                ? { dot: "bg-muted-foreground", label: "decididos" }
                : { dot: "bg-foreground", label: `${String(pendingCount)} por confirmar` }
            }
          />
          <h3 className="font-heading text-lg leading-snug font-bold text-pretty">
            {author} dejó {changesLabel(actions.length)} listos
          </h3>
        </div>
      </div>

      <ol className="flex flex-col divide-y divide-border rounded-2xl bg-background/85 ring-1 ring-border">
        {actions.map((action, index) => (
          <li key={action.id} aria-busy={action.busy !== null} className="flex min-w-0 flex-col gap-3 px-4 py-3.5">
            <ActionBody
              action={action}
              phase={phases[index] ?? action.phase}
              disabled={disabled}
              onConfirm={onConfirm}
              onReject={onReject}
              nested
            />
          </li>
        ))}
      </ol>

      {showSweep ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            type="button"
            variant="contrast"
            className="h-10 rounded-full px-[18px]"
            disabled={disabled || sweeping || sweepable.length < 2}
            onClick={sweep}
          >
            {sweeping ? (
              <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            ) : (
              <Check aria-hidden="true" className="size-4" />
            )}
            {sweeping ? "Confirmando…" : sweepLabel}
          </Button>
          <span className="text-xs text-muted-foreground">Uno por uno, en orden. Puedes descartar los que no quieras.</span>
        </div>
      ) : null}
    </section>
  );
});

// -------------------------------------------------------------------- piezas

function ActionBody({
  action,
  phase,
  disabled,
  onConfirm,
  onReject,
  nested = false,
}: {
  action: AssistantActionView;
  phase: ActionPhase;
  disabled: boolean;
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  /** Dentro de la lista agrupada: sin cuadro propio, controles más bajos. */
  nested?: boolean;
}) {
  const riskId = useId();
  const external = action.risk === "external";
  const open = phase === "pending" || phase === "forbidden";
  const busy = action.busy !== null;
  const verb = confirmVerb(action.risk);
  const outcome = outcomeOf(action, phase);
  const kicker = (
    <Kicker
      label={external ? "Acción externa" : "Cambio"}
      state={{ dot: actionPhaseDot(phase), label: actionPhaseLabel(phase).toLowerCase() }}
    />
  );

  return (
    <>
      {nested ? (
        <div className="flex min-w-0 flex-col gap-1">
          {kicker}
          <p className="text-[14.5px] leading-snug font-semibold break-words text-pretty">{action.summary}</p>
        </div>
      ) : (
        <div className="flex items-start gap-3.5">
          <Tile icon={external ? Send : PencilLine} muted={!open} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {kicker}
            <h3 className="font-heading text-lg leading-snug font-bold break-words text-pretty">{action.summary}</h3>
            {action.origin === null ? null : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Plug aria-hidden="true" className="size-3.5 flex-none" />
                <span className="min-w-0 break-words">Pedido desde {action.origin} (app conectada)</span>
              </span>
            )}
          </div>
        </div>
      )}

      {action.lines !== null && action.lines.length > 0 ? <Diff lines={action.lines} nested={nested} /> : null}

      {action.effects !== null && action.effects.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Qué va a pasar
          </span>
          <ul className="flex flex-col gap-1">
            {action.effects.map((effect) => (
              <li key={effect} className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <span aria-hidden="true" className="mt-[0.6em] size-1 flex-none rounded-full bg-muted-foreground/60" />
                <span className="min-w-0 break-words">{effect}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {external && phase === "pending" ? (
        <Alert variant="warning" role="note" id={riskId} className="rounded-2xl">
          <TriangleAlert />
          <AlertDescription className="text-[12.5px] leading-relaxed text-foreground">
            Sale de tu cuenta: puede llegar a tus clientes, tener costo o no poder deshacerse. Revísalo antes de aprobar.
          </AlertDescription>
        </Alert>
      ) : null}

      {outcome === null ? null : <OutcomeLine outcome={outcome} />}
      {/* La región viva existe desde el montaje (una región que nace con su
          texto no se lee) y va aparte de la línea visible: `sr-only` sale del
          flujo, así que vacía no abre un hueco en la tarjeta. Al recargar un
          hilo nace ya escrita y no se anuncia: es historia, no novedad. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {outcome?.text ?? ""}
      </p>

      {open ? (
        <div className="flex flex-wrap items-center gap-2">
          {phase === "pending" ? (
            <Button
              type="button"
              variant="contrast"
              className={cn("rounded-full", nested ? "h-9 px-4" : "h-10 px-[18px]")}
              disabled={disabled || busy}
              aria-describedby={external ? riskId : undefined}
              onClick={() => {
                onConfirm(action.id);
              }}
            >
              {action.busy === "confirm" ? (
                <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
              ) : external ? (
                <ShieldCheck aria-hidden="true" className="size-4" />
              ) : (
                <Check aria-hidden="true" className="size-4" />
              )}
              {action.busy === "confirm" ? verb.busy : verb.idle}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="glass"
            className={nested ? "h-9 px-4" : "h-10 px-4"}
            disabled={disabled || busy}
            onClick={() => {
              onReject(action.id);
            }}
          >
            {action.busy === "reject" ? (
              <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            ) : null}
            {action.busy === "reject" ? "Descartando…" : "Descartar"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/**
 * El antes → después. Las palabras «Antes»/«Ahora» van para el lector de
 * pantalla: el tachado y la flecha solo se ven.
 */
function Diff({ lines, nested }: { lines: readonly ActionPreviewLine[]; nested: boolean }) {
  return (
    <dl
      className={cn(
        "flex flex-col",
        nested ? "gap-2" : "divide-y divide-border rounded-2xl bg-background/85 ring-1 ring-border",
      )}
    >
      {lines.map((line, index) => (
        <div key={`${line.label}-${String(index)}`} className={cn("flex min-w-0 flex-col gap-0.5", !nested && "px-3.5 py-2.5")}>
          <dt className="text-[11.5px] leading-snug break-words text-muted-foreground">{line.label}</dt>
          <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[14px] tabular-nums">
            {line.before === null ? (
              <span className="sr-only">Nuevo: </span>
            ) : (
              <>
                <span className="sr-only">Antes: </span>
                <s className="min-w-0 break-words text-muted-foreground decoration-muted-foreground/60">{line.before}</s>
                <ArrowRight aria-hidden="true" className="size-3.5 flex-none self-center text-muted-foreground" />
                <span className="sr-only">Ahora: </span>
              </>
            )}
            <span className="min-w-0 font-semibold break-words">{line.after}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface OutcomeView {
  icon: LucideIcon;
  /** El color va en el icono; el texto, en tinta (AA en los dos temas). */
  tone: string;
  text: string;
}

/** El desenlace que se le cuenta a la persona, o `null` si no hay nada que contar. */
function outcomeOf(action: AssistantActionView, phase: ActionPhase): OutcomeView | null {
  switch (phase) {
    case "pending":
      return action.error === null
        ? null
        : {
            icon: TriangleAlert,
            tone: "text-destructive",
            text: `No llegó a ${action.risk === "external" ? "aprobarse" : "confirmarse"}: ${action.error}`,
          };
    case "executed":
      return { icon: CircleCheck, tone: "text-success", text: action.text ?? "Hecho." };
    case "failed":
      return { icon: CircleX, tone: "text-destructive", text: action.text ?? "No se pudo hacer el cambio." };
    case "rejected":
      return { icon: Ban, tone: "text-muted-foreground", text: "Descartado. No se cambió nada." };
    case "expired":
      return {
        icon: Clock,
        tone: "text-muted-foreground",
        text: action.text ?? "Venció sin confirmarse. Si todavía lo quieres, pídeselo de nuevo a Axel.",
      };
    case "forbidden":
      return { icon: ShieldAlert, tone: "text-warning", text: action.text ?? "No tienes permiso para hacer este cambio." };
  }
}

function OutcomeLine({ outcome }: { outcome: OutcomeView }) {
  const Icon = outcome.icon;
  return (
    <p className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground">
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4 flex-none", outcome.tone)} />
      <span className="min-w-0 break-words whitespace-pre-line">{outcome.text}</span>
    </p>
  );
}

function Kicker({ label, state }: { label: string; state: { dot: string; label: string } }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
      <span className="whitespace-nowrap">{label}</span>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", state.dot)} />
        <span>{state.label}</span>
      </span>
    </span>
  );
}

function Tile({ icon: Icon, muted }: { icon: LucideIcon; muted: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 flex-none items-center justify-center rounded-[13px]",
        muted ? "bg-foreground/[0.08] text-muted-foreground" : "bg-foreground text-background",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2.1} />
    </span>
  );
}
