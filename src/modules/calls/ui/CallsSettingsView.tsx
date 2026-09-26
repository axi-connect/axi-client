"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, LoaderCircle, Mic2, Phone, RotateCcw } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { StatePill } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { CallsSettingsDTO, TenantCallNumberDTO } from "@/modules/calls/domain/call";
import { getTenantAgents } from "@/modules/agents/public";
import {
  getCallsSettings,
  listTenantCallNumbers,
  putCallsSettings,
} from "@/modules/calls/infrastructure/services/calls-service.adapter";
import {
  buildCallsSettingsFields,
  callsSettingsFormSchema,
  fromCallsSettingsDto,
  toCallsSettingsPayload,
  type CallsSettingsFormValues,
} from "@/modules/calls/ui/forms/config/calls-settings.config";
import { CallsPageHeader } from "@/modules/calls/ui/components/CallsPageHeader";

const PANEL = "rounded-3xl border border-border bg-card p-5";
const HEADER = <CallsPageHeader kicker="Llamadas · configuración" title="Cómo contesta y llama tu agente" />;

/**
 * Configuración del módulo (`/calls/settings`, llamadas premium F5, canvas
 * tablero 8). Con `calls:read` es de solo
 * lectura; `calls:manage` habilita la edición (molde SchedulingSettingsView).
 * El PUT responde 204: tras guardar se RE-CONSULTA la vista resuelta.
 */
export function CallsSettingsView() {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canManage = hasPermission("calls:manage");

  const [settings, setSettings] = useState<CallsSettingsDTO | null>(null);
  const [numbers, setNumbers] = useState<TenantCallNumberDTO[] | null>(null);
  const [agentNames, setAgentNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    Promise.all([getCallsSettings(), listTenantCallNumbers()])
      .then(([settingsData, numbersData]) => {
        if (!alive) return;
        setSettings(settingsData);
        setNumbers(numbersData);
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err));
      });
    // El nombre del agente que contesta: best-effort (solo lista los activos)
    getTenantAgents()
      .then((agents) => {
        if (alive) setAgentNames(new Map(agents.map((agent) => [agent.id, agent.name])));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const fields = useMemo(() => buildCallsSettingsFields({ canManage }), [canManage]);
  const defaultValues = useMemo(
    () => (settings === null ? undefined : fromCallsSettingsDto(settings)),
    [settings],
  );

  if (error !== null) {
    return (
      <div className="flex flex-col gap-6">
        {HEADER}
        <div role="alert" className={`${PANEL} flex flex-col items-center gap-3 py-10 text-center`}>
          <span aria-hidden className="size-2.5 rounded-full bg-destructive ring-[6px] ring-destructive/15" />
          <p className="text-sm font-semibold">No pudimos cargar la configuración</p>
          <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setReloadKey((k) => k + 1)}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const hasCallerId = numbers?.some((number) => number.kind === "caller_id") ?? false;

  return (
    <div className="flex flex-col gap-6">
      {HEADER}
      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section aria-label="Tu número de llamadas" className={PANEL}>
            <h2 className="mb-3 text-sm font-semibold">Tu número de llamadas</h2>
            {numbers === null ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : numbers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aún no tienes un número asignado. El equipo de axi lo aprovisiona por ti — al
                asignarlo aparecerá aquí.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {numbers.map((number) => {
                  // El identificador verificado es lo que ven tus clientes al
                  // llamarles; el número Twilio recibe las entrantes y define
                  // quién contesta. Si hay identificador, se dice explícitamente.
                  const isCallerId = number.kind === "caller_id";
                  return (
                    <li key={number.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        aria-hidden
                      >
                        {isCallerId ? <BadgeCheck className="size-4" /> : <Phone className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-medium">{number.phone_number}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {isCallerId ? (
                            "Se muestra al llamar: es el número que ven tus clientes"
                          ) : (
                            <>
                              Contesta:{" "}
                              {number.default_ai_agent_id === null
                                ? "sin agente configurado"
                                : (agentNames.get(number.default_ai_agent_id) ?? "agente IA")}
                              {" · Entrantes "}
                              {number.inbound_enabled ? "habilitadas" : "deshabilitadas"}
                              {hasCallerId && " · Recibe las entrantes"}
                            </>
                          )}
                        </p>
                      </div>
                      <StatePill tone={isCallerId ? "neutral" : number.inbound_enabled ? "success" : "neutral"}>
                        {isCallerId ? "Identificador" : number.inbound_enabled ? "Recibe llamadas" : "Solo para llamar"}
                      </StatePill>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Voz del agente" className={PANEL}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Mic2 className="size-4 text-muted-foreground" aria-hidden />
              Voz del agente
            </h2>
            <p className="text-muted-foreground text-sm">
              La voz se configura en <b>cada agente</b> (Agentes → tu agente → Voz) y aplica por
              igual a las llamadas y a las notas de voz de WhatsApp.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
              <Link href="/admin/agents">Ir a los agentes</Link>
            </Button>
          </section>
        </div>

        <section aria-label="Reglas de las llamadas" className={PANEL}>
          <h2 className="mb-4 text-sm font-semibold">Reglas de las llamadas</h2>
          {settings === null || defaultValues === undefined ? (
            <div className="space-y-3" role="status" aria-label="Cargando configuración">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <DynamicForm<CallsSettingsFormValues>
              schema={callsSettingsFormSchema}
              fields={fields}
              defaultValues={defaultValues}
              columns={{ base: 1, md: 2 }}
              actions={{
                // Barra de acción en TINTA (§9.5.1), pegada abajo y solo con cambios.
                render: ({ submitting, dirty }) =>
                  canManage && (dirty || submitting) ? (
                    <Island
                      as="footer"
                      material="ink"
                      glow="none"
                      className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl py-2 pr-2 pl-5 sm:rounded-full"
                    >
                      <span className="text-sm">Tienes cambios sin guardar</span>
                      <Button type="submit" disabled={submitting} className="rounded-full">
                        {submitting && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
                        Guardar cambios
                      </Button>
                    </Island>
                  ) : null,
              }}
              onSubmit={async (values, form) => {
                try {
                  await putCallsSettings(toCallsSettingsPayload(values));
                  // 204 sin cuerpo: la vista resuelta se re-consulta
                  const resolved = await getCallsSettings();
                  setSettings(resolved);
                  form.reset(fromCallsSettingsDto(resolved));
                  showAlert({
                    tone: "success",
                    title: "Configuración de llamadas guardada",
                    description: "Aplica de inmediato a las llamadas nuevas.",
                  });
                } catch (err) {
                  showAlert({ tone: "error", title: errorMessage(err) });
                }
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
