"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Mic2, Phone, RotateCcw } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { StatusBadge } from "@/shared/components/features/status-badge";
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

const CARD = "border-border shadow-float bg-background rounded-lg border p-5";

/**
 * Configuración del módulo (`/calls/settings`). Con `calls:read` es de solo
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
      <div className="p-4 md:p-6">
        <div className="border-destructive/40 bg-destructive/5 flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm">
          <span className="min-w-0 flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-5 p-4 md:p-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col gap-5">
        <section className={CARD}>
          <h2 className="mb-3 text-sm font-semibold">Tu número de llamadas</h2>
          {numbers === null ? (
            <Skeleton className="h-16 w-full rounded-lg" />
          ) : numbers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aún no tienes un número asignado. El equipo de axi lo aprovisiona por ti — al
              asignarlo aparecerá aquí.
            </p>
          ) : (
            <ul className="space-y-3">
              {numbers.map((number) => (
                <li key={number.id} className="flex items-start gap-3">
                  <span
                    className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet flex size-9 shrink-0 items-center justify-center rounded-full border"
                    aria-hidden
                  >
                    <Phone className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium">{number.phone_number}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Contesta:{" "}
                      {number.default_ai_agent_id === null
                        ? "sin agente configurado"
                        : (agentNames.get(number.default_ai_agent_id) ?? "agente IA")}
                      {" · Entrantes "}
                      {number.inbound_enabled ? "habilitadas" : "deshabilitadas"}
                    </p>
                  </div>
                  <StatusBadge
                    status="active"
                    map={{ active: { label: "Activo", tone: "success" } }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={CARD}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Mic2 className="text-accent-violet size-4" aria-hidden />
            Voz del agente
          </h2>
          <p className="text-muted-foreground text-sm">
            La voz se configura en el <b>personaje del agente</b> y aplica por igual a las
            llamadas y a las notas de voz de WhatsApp.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
            <Link href="/admin/agents">Ir a los agentes</Link>
          </Button>
        </section>
      </div>

      <section className={CARD}>
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
              render: ({ submitting, dirty }) =>
                canManage ? (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit" disabled={submitting || !dirty}>
                      {submitting && (
                        <LoaderCircle aria-hidden className="size-4 animate-spin" />
                      )}
                      Guardar configuración
                    </Button>
                  </div>
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
                  open: true,
                });
              } catch (err) {
                showAlert({ tone: "error", title: errorMessage(err), open: true });
              }
            }}
          />
        )}
      </section>
    </div>
  );
}
