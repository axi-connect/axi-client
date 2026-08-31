"use client";

import {
  Check,
  CircleSlash,
  LoaderCircle,
  Minus,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";

import { RelativeDate } from "@/shared/components/ui/relative-date";
import {
  Timeline,
  type TimelineItem,
  type TimelineTone,
} from "@/shared/components/features/timeline";
import {
  ATTRIBUTE_LABELS,
  PROVIDER_LABELS,
  RUN_STEP_LABELS,
  isRunInFlight,
  type EnrichmentRunDTO,
  type RunStepDTO,
  type RunStepState,
} from "../../domain/lead";

/**
 * Cómo se pinta cada desenlace.
 *
 * Los tonos son SEMÁNTICOS y no de marca: el design system los separa a
 * propósito, y el coral es color de acción — gastarlo en decorar un resultado
 * lo devalúa donde sí importa. `no_data` va en neutro porque no es un fallo:
 * preguntamos y esa fuente no sabía nada.
 */
const STEP_STYLE: Record<RunStepState, { icon: TimelineItem["icon"]; tone: TimelineTone }> = {
  pending: { icon: Minus, tone: "neutral" },
  running: { icon: LoaderCircle, tone: "info" },
  found: { icon: Check, tone: "success" },
  no_data: { icon: Minus, tone: "neutral" },
  failed: { icon: TriangleAlert, tone: "warning" },
  no_account: { icon: CircleSlash, tone: "neutral" },
};

/**
 * Qué se consultó al buscarle datos a este lead, y qué dio cada fuente.
 *
 * Existe porque enriquecer era una caja negra: el trabajo corría, a veces no
 * encontraba nada, y desde fuera eso era idéntico a que siguiera corriendo.
 * Aquí «no encontramos nada» es un desenlace con su propia pantalla, que es
 * justo lo que faltaba.
 *
 * Lee de `lead.last_run` —la fila, que es la verdad— y el WebSocket solo la
 * adelanta. Quien recarga a mitad de una búsqueda ve exactamente lo mismo.
 */
export function EnrichmentRunCard({ run }: { run: EnrichmentRunDTO | null }) {
  if (run === null) {
    return (
      <section className="border-border shadow-float bg-background rounded-lg border p-5">
        <Heading />
        <div className="py-4 text-center">
          <span className="bg-secondary text-muted-foreground mx-auto mb-2.5 flex size-9 items-center justify-center rounded-full">
            <WandSparkles aria-hidden className="size-4" />
          </span>
          <p className="text-muted-foreground mx-auto max-w-[44ch] text-xs">
            Todavía no hemos buscado datos de este lead. Preguntaremos a las fuentes gratuitas
            —registro mercantil, OpenStreetMap y su propia web— y te contaremos qué encontró cada
            una.
          </p>
        </div>
      </section>
    );
  }

  const live = isRunInFlight(run);
  const items = run.steps.map(toTimelineItem);

  return (
    <section className="border-border shadow-float bg-background rounded-lg border p-5">
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div>
          <Heading />
          <p className="text-muted-foreground text-xs">{summary(run)}</p>
        </div>
        <span className="ml-auto">
          <RunPill run={run} />
        </span>
      </div>

      <Timeline items={items} />

      {/* El coste, dicho aunque sea cero: es la pregunta que el dueño se hace
          cada vez que algo consulta a un tercero. */}
      <p className="border-border-soft text-muted-foreground mt-3 border-t pt-3 text-[11.5px]">
        {run.units_spent === 0
          ? "No gastó unidades de tu plan: todas las fuentes consultadas son gratuitas."
          : `Consumió ${String(run.units_spent)} ${run.units_spent === 1 ? "unidad" : "unidades"} de tu plan.`}
      </p>
      {live && (
        <p className="text-muted-foreground mt-1 text-[11.5px]">
          Los datos aparecen arriba en cuanto llegan.
        </p>
      )}
    </section>
  );
}

function Heading() {
  return (
    <h2 className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.085em] uppercase">
      Última búsqueda de datos
    </h2>
  );
}

/** El titular: cuántas fuentes, cuántos datos y cuándo. */
function summary(run: EnrichmentRunDTO): string {
  const consulted = run.steps.filter(
    (step) => step.state !== "pending" && step.state !== "no_account",
  ).length;
  const fuentes = `${String(consulted)} ${consulted === 1 ? "fuente" : "fuentes"}`;
  if (isRunInFlight(run)) {
    return `${fuentes} de ${String(run.steps.length)} · en curso`;
  }
  const datos =
    run.fields_filled === 0
      ? "ningún dato nuevo"
      : `${String(run.fields_filled)} ${run.fields_filled === 1 ? "dato nuevo" : "datos nuevos"}`;
  return `${fuentes} · ${datos}`;
}

function RunPill({ run }: { run: EnrichmentRunDTO }) {
  if (isRunInFlight(run)) {
    return (
      <span className="border-info/25 bg-info/10 text-info inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold">
        <LoaderCircle aria-hidden className="size-3 animate-spin" />
        Consultando fuentes…
      </span>
    );
  }
  // «No encontramos nada» va en neutro, no en rojo: es un desenlace legítimo,
  // no un error. Pintarlo de alarma haría que el dueño buscara un fallo que no
  // existe.
  const found = run.fields_filled > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${
        found
          ? "border-success/25 bg-success/10 text-success"
          : "border-border bg-secondary text-muted-foreground"
      }`}
    >
      {found ? <Check aria-hidden className="size-3" /> : <Minus aria-hidden className="size-3" />}
      {found
        ? `Encontramos ${String(run.fields_filled)} ${run.fields_filled === 1 ? "dato" : "datos"}`
        : "No encontramos nada nuevo"}
    </span>
  );
}

function toTimelineItem(step: RunStepDTO, index: number): TimelineItem {
  const style = STEP_STYLE[step.state];
  const label = PROVIDER_LABELS[step.provider] ?? step.provider;
  const seconds =
    step.latency_ms === null || step.latency_ms === undefined
      ? null
      : `${(step.latency_ms / 1000).toFixed(1)} s`;

  // El resumen de una línea: qué trajo y cuánto tardó. Es lo que se lee de un
  // vistazo sin desplegar nada.
  const fields = step.fields.map((field) => ATTRIBUTE_LABELS[field] ?? field);
  const quick =
    step.state === "found"
      ? fields.join(", ")
      : RUN_STEP_LABELS[step.state];

  return {
    id: `${step.capability}-${step.provider}-${String(index)}`,
    icon: style.icon,
    tone: style.tone,
    pending: step.state === "pending",
    title: <span className="font-semibold">{label}</span>,
    description: seconds === null ? quick : `${quick} · ${seconds}`,
    defaultOpen: step.state === "running",
    content: detailOf(step, fields),
  };
}

/** El detalle desplegable. `undefined` = no hay nada que contar, no se despliega. */
function detailOf(step: RunStepDTO, fields: string[]): React.ReactNode {
  const hasDetail = step.detail !== null && step.detail !== undefined && step.detail.length > 0;
  if (fields.length === 0 && !hasDetail) return undefined;

  return (
    <>
      {fields.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {fields.map((field) => (
            <li
              key={field}
              className="border-success/25 bg-success/10 text-success rounded-full border px-2 py-0.5 text-[11px] font-medium"
            >
              {field}
            </li>
          ))}
        </ul>
      )}
      {hasDetail && (
        <p className={`text-muted-foreground text-[11.5px] ${fields.length > 0 ? "mt-2" : ""}`}>
          {step.detail}
        </p>
      )}
    </>
  );
}

/** La fecha de la pasada, para el pie de la ficha. */
export function RunTimestamp({ run }: { run: EnrichmentRunDTO }) {
  return <RelativeDate iso={run.finished_at ?? run.created_at} />;
}
