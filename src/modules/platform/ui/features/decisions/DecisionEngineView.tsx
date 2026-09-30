"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { StatePill } from "@/shared/components/features/bento";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  errorRate,
  formatMs,
  formatUsd,
  groupOptions,
  MODE_OPTIONS,
  parseTargetKey,
  PURPOSE_META,
  routeChanged,
  targetKey,
  targetName,
  type DecisionMode,
  type DecisionRouteRow,
  type DecisionTargetOption,
  type UpdateDecisionRouteDTO,
} from "../../../domain/decisions";
import {
  useDecisionHealthQuery,
  useDecisionRoutesQuery,
  useSaveDecisionRoute,
} from "../../../infrastructure/api/hooks/use-decisions";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";

const NO_FALLBACK = "__none__";
const WINDOWS = [
  { value: "24", label: "24 h" },
  { value: "168", label: "7 días" },
] as const;

/**
 * /platform/ai · Motor de decisiones (P1b). Mockup aprobado por el dueño el
 * 2026-09-29 (docs/design/mockups/decisiones-ia/). Dos bloques: el
 * enrutamiento por propósito (modo, principal y respaldo, uno por fila y se
 * guarda por fila) y la salud por proveedor y modelo.
 */
export function DecisionEngineView() {
  const routes = useDecisionRoutesQuery();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Motor de decisiones</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
          Qué proveedor decide cada tipo de pregunta y quién responde si falla. Solo se ofrecen
          modelos con tarifa en Pricing IA. Los cambios se aplican a todos los tenants en menos de
          un minuto.
        </p>
      </header>

      {routes.isError ? (
        <ProblemAlert error={routes.error} onRetry={() => void routes.refetch()} className="mx-auto max-w-xl" />
      ) : (
        <>
          <Alert variant="info">
            <Info />
            <AlertDescription>
              <span>
                <strong className="font-semibold">Sombra</strong>: el módulo sigue con su método de
                siempre y el proveedor corre en paralelo solo para medir; lo paga axi.{" "}
                <strong className="font-semibold">Decide</strong>: el proveedor decide.{" "}
                <strong className="font-semibold">Apagado</strong>: el módulo usa su heurística.
              </span>
            </AlertDescription>
          </Alert>
          <section aria-labelledby="dec-routes" className="border-border bg-card @container rounded-3xl border">
            <header className="px-5 pt-5 pb-3 sm:px-6">
              <h2 id="dec-routes" className="font-heading text-lg font-bold tracking-tight">
                Enrutamiento por propósito
              </h2>
              <p className="text-muted-foreground text-sm">Cada fila se guarda por separado.</p>
            </header>
            {routes.isPending ? (
              <div className="px-5 pb-5 sm:px-6">
                <TableSkeleton rows={5} />
              </div>
            ) : (
              <ul>
                {routes.data.routes.map((route) => (
                  <RouteRow key={route.purpose} route={route} options={routes.data.options} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <HealthCard options={routes.data?.options ?? []} />
    </div>
  );
}

// ── Enrutamiento ─────────────────────────────────────────────────────────────

function toDraft(route: DecisionRouteRow): UpdateDecisionRouteDTO {
  return { mode: route.mode, primary: route.primary, fallback: route.fallback };
}

function RouteRow({ route, options }: { route: DecisionRouteRow; options: readonly DecisionTargetOption[] }) {
  const { showAlert } = useAlert();
  const save = useSaveDecisionRoute();
  const [draft, setDraft] = useState<UpdateDecisionRouteDTO>(() => toDraft(route));
  // Lo guardado cambia (otro operador, la invalidación tras guardar): la fila vuelve a él.
  useEffect(() => setDraft(toDraft(route)), [route]);

  const meta = PURPOSE_META[route.purpose];
  const dirty = routeChanged(route, draft);
  const off = draft.mode === "off";
  const groups = groupOptions(options);

  async function handleSave() {
    try {
      await save.mutateAsync({ purpose: route.purpose, body: draft });
      showAlert({ tone: "success", title: "Ruta guardada" });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar la ruta", description: errorMessage(error) });
    }
  }

  return (
    <li
      className={cn(
        "border-border grid grid-cols-1 gap-x-4 gap-y-3 border-t px-5 py-4 sm:px-6",
        // Estado en pista FIJA: con `auto`, cada fila (su propia rejilla) medía
        // distinto según dijera «Normal» o «Apagado» y las columnas no alineaban.
        "@5xl:grid-cols-[minmax(11rem,1fr)_auto_minmax(10.5rem,1fr)_minmax(10.5rem,1fr)_9.5rem] @5xl:items-end",
        dirty && "bg-primary/[0.04]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5 @5xl:self-center">
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="text-muted-foreground text-xs text-pretty">{meta.description}</span>
        <code className="text-muted-foreground font-mono text-xs">{route.purpose}</code>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Modo</span>
        <SegmentedControl
          label={`Modo de ${meta.label}`}
          size="sm"
          surface="inline"
          value={draft.mode}
          items={MODE_OPTIONS}
          onValueChange={(mode: DecisionMode) => setDraft((prev) => ({ ...prev, mode }))}
        />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 @md:grid-cols-2 @5xl:contents">
        <TargetSelect
          id={`dec-${route.purpose}-primary`}
          label="Proveedor principal"
          value={targetKey(draft.primary)}
          groups={groups}
          disabled={off}
          onChange={(key) => {
            const target = parseTargetKey(key);
            if (target !== null) setDraft((prev) => ({ ...prev, primary: target }));
          }}
        />
        <TargetSelect
          id={`dec-${route.purpose}-fallback`}
          label="Respaldo"
          value={draft.fallback === null ? NO_FALLBACK : targetKey(draft.fallback)}
          groups={groups}
          allowNone
          disabled={off}
          onChange={(key) =>
            setDraft((prev) => ({ ...prev, fallback: key === NO_FALLBACK ? null : parseTargetKey(key) }))
          }
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 @5xl:flex-col @5xl:items-start @5xl:self-center">
        <RouteState route={route} draftMode={draft.mode} />
        {dirty && (
          <Button size="sm" className="rounded-full" disabled={save.isPending} onClick={() => void handleSave()}>
            {save.isPending ? "Guardando…" : "Guardar ruta"}
          </Button>
        )}
      </div>
    </li>
  );
}

function RouteState({ route, draftMode }: { route: DecisionRouteRow; draftMode: DecisionMode }) {
  if (draftMode === "off") return <StatePill tone="neutral">Apagado</StatePill>;
  if (route.primary_breaker.open) {
    return (
      <span className="flex flex-col items-start gap-1">
        <StatePill tone="warning">Cortacircuito abierto</StatePill>
        <span className="text-muted-foreground text-xs">Responde el respaldo</span>
      </span>
    );
  }
  return <StatePill tone="success">Normal</StatePill>;
}

function TargetSelect({
  id,
  label,
  value,
  groups,
  allowNone,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  groups: { provider: string; options: DecisionTargetOption[] }[];
  allowNone?: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NO_FALLBACK}>Ninguno</SelectItem>}
          {groups.map((group) => (
            <SelectGroup key={group.provider}>
              <SelectLabel>{group.provider}</SelectLabel>
              {group.options.map((option) => (
                <SelectItem key={targetKey(option)} value={targetKey(option)}>
                  {option.display_name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Salud ────────────────────────────────────────────────────────────────────

function HealthCard({ options }: { options: readonly DecisionTargetOption[] }) {
  const [hours, setHours] = useState<(typeof WINDOWS)[number]["value"]>("24");
  const health = useDecisionHealthQuery(Number(hours));

  return (
    <section aria-labelledby="dec-health" className="border-border bg-card @container rounded-3xl border">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 id="dec-health" className="font-heading text-lg font-bold tracking-tight">
            Salud por proveedor
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
            Decisiones, errores y latencia de cada proveedor y modelo. «Respondió de respaldo» cuenta
            las veces que el principal falló o estaba en pausa.
          </p>
        </div>
        <SegmentedControl label="Ventana" size="sm" value={hours} items={WINDOWS} onValueChange={setHours} />
      </header>

      {health.isPending ? (
        <div className="px-5 pb-5 sm:px-6">
          <TableSkeleton rows={3} />
        </div>
      ) : health.isError ? (
        <div className="px-5 pb-5 sm:px-6">
          <ProblemAlert error={health.error} onRetry={() => void health.refetch()} />
        </div>
      ) : health.data.data.length === 0 ? (
        <EmptyState
          glyph="ai"
          title={hours === "24" ? "Todavía no hay decisiones en estas 24 horas" : "Todavía no hay decisiones en estos 7 días"}
          description="Aparecen en cuanto un módulo decide o el clasificador corre en sombra. Mide un proveedor antes de activarlo desde Calidad."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5 sm:pl-6">Proveedor y modelo</TableHead>
              <TableHead className="text-right">Decisiones</TableHead>
              <TableHead className="hidden text-right @xl:table-cell">Errores</TableHead>
              <TableHead className="hidden text-right @2xl:table-cell">Respondió de respaldo</TableHead>
              <TableHead className="hidden text-right @3xl:table-cell">p50</TableHead>
              <TableHead className="text-right">p95</TableHead>
              <TableHead className="pr-5 text-right sm:pr-6">Costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {health.data.data.map((row) => (
              <TableRow key={`${row.provider}|${row.model}`}>
                <TableCell className="pl-5 sm:pl-6">
                  <div className="flex min-w-0 flex-col gap-0.5 @md:min-w-44">
                    <span className="truncate font-medium" title={targetName(row, options)}>
                      {targetName(row, options)}
                    </span>
                    <code className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {row.provider} · {row.model}
                    </code>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.decisions.toLocaleString("es-CO")}</TableCell>
                <TableCell className="hidden text-right tabular-nums @xl:table-cell">
                  {row.errors.toLocaleString("es-CO")}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({(errorRate(row) * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %)
                  </span>
                </TableCell>
                <TableCell className="hidden text-right tabular-nums @2xl:table-cell">
                  {row.fallbacks === 0 ? "—" : row.fallbacks.toLocaleString("es-CO")}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums whitespace-nowrap @3xl:table-cell">
                  {formatMs(row.p50_latency_ms)}
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMs(row.p95_latency_ms)}</TableCell>
                <TableCell className="pr-5 text-right tabular-nums whitespace-nowrap sm:pr-6">
                  {formatUsd(row.cost_usd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
