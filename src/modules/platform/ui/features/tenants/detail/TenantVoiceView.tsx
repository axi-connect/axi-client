"use client";

/**
 * Tab «Voz» del detalle de tenant (gobierno de la voz, 2026-09-21): quién
 * decide si este tenant habla y con qué cuenta. El tenant ya no gestiona esto
 * —elige la voz de cada agente en su estudio—; aquí axi enciende la capacidad,
 * ve el consumo del ciclo y guarda su llave propia de ElevenLabs.
 *
 * Ficha como LISTA (etiqueta → valor, un indicador por fila), no tabla. El
 * plan aparece solo como contexto: la llave se pega siempre (V5), nada se
 * deshabilita por plan. La llave es write-only: se escribe una vez y no vuelve
 * a mostrarse. Todo queda en Auditoría con el usuario de plataforma.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, AudioLines, Gauge, KeyRound, Layers, Mic, MicOff, ShieldCheck, Trash2 } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
import { Switch } from "@/shared/components/ui/switch";
import { PLAN_TIER_LABELS, voiceUsageLabel, voiceUsageTone, type TenantVoiceDTO } from "../../../../domain/tenant-voice";
import {
  useRemoveTenantVoiceCredential,
  useSetTenantVoiceCredential,
  useSetTenantVoiceEnabled,
  useTenantVoiceQuery,
} from "../../../../infrastructure/api/hooks/use-tenant-voice";
import { ConfirmTyped } from "../../../components/ConfirmTyped";
import { ProblemAlert } from "../../../components/ProblemAlert";

/** Mismo mínimo que `SetTtsCredentialDto` en el servidor: menos es 400 seguro. */
const KEY_MIN = 16;

function Row({
  icon: Icon,
  title,
  description,
  control,
  children,
  muted = false,
}: {
  icon: typeof Mic;
  title: React.ReactNode;
  description: React.ReactNode;
  control?: React.ReactNode;
  children?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3.5 gap-y-1 border-b border-border/60 py-4 first:pt-1 last:border-b-0 last:pb-1 sm:grid-cols-[40px_minmax(0,1fr)_auto]">
      <div className={cn("grid size-10 place-items-center rounded-xl bg-secondary", muted ? "text-muted-foreground" : "text-foreground")}>
        <Icon aria-hidden="true" className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14.5px] font-medium">{title}</div>
        <p className="mt-0.5 max-w-[64ch] text-[13px] text-muted-foreground">{description}</p>
      </div>
      {control ? <div className="col-start-2 flex items-center gap-2.5 pt-1 sm:col-start-3 sm:pt-2">{control}</div> : null}
      {children ? <div className="col-span-full mt-1.5 flex flex-col gap-2">{children}</div> : null}
    </div>
  );
}

function UsageBar({ usage }: { usage: NonNullable<TenantVoiceDTO["usage"]> }) {
  const tone = voiceUsageTone(usage);
  const pct = usage.pct_used ?? 0;
  const periodEnd = new Date(usage.period_end).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  return (
    <>
      <div className="h-2 max-w-[420px] overflow-hidden rounded-full border border-border/60 bg-secondary">
        <div
          role="progressbar"
          aria-label="Caracteres de voz del ciclo"
          aria-valuenow={Math.round(Math.min(100, pct))}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn(
            "h-full rounded-full",
            tone === "ok" && "bg-accent-violet",
            tone === "warning" && "bg-warning",
            tone === "off" && (usage.pct_used === null ? "bg-accent-violet/40" : "bg-destructive"),
          )}
          style={{ width: `${String(Math.min(100, pct))}%` }}
        />
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {voiceUsageLabel(usage)} · ciclo hasta el {periodEnd} · ≈ 280 caracteres por nota
      </p>
    </>
  );
}

export function TenantVoiceView({ tenantId }: { tenantId: string }) {
  const { data, isPending, isError, error, refetch } = useTenantVoiceQuery(tenantId);
  const setEnabled = useSetTenantVoiceEnabled(tenantId);
  const setCredential = useSetTenantVoiceCredential(tenantId);
  const removeCredential = useRemoveTenantVoiceCredential(tenantId);
  const { showAlert } = useAlert();
  const [apiKey, setApiKey] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (isPending) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando la voz del tenant">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />;

  const busy = setEnabled.isPending || setCredential.isPending || removeCredential.isPending;

  const toggle = async (next: boolean) => {
    try {
      await setEnabled.mutateAsync(next);
      showAlert({
        tone: "success",
        title: next ? "Notas de voz activadas" : "Notas de voz desactivadas",
        description: next
          ? "Sus agentes con voz elegida responderán con audio desde el siguiente mensaje."
          : "Sus agentes siguen atendiendo por texto.",
        autoCloseMs: 4000,
      });
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo cambiar el interruptor", description: errorMessage(err) });
    }
  };

  const saveKey = async () => {
    const key = apiKey.trim();
    if (key.length < KEY_MIN) return;
    try {
      await setCredential.mutateAsync(key);
      setApiKey("");
      showAlert({
        tone: "success",
        title: "Llave guardada",
        description: "La voz de este tenant se sintetiza ahora con su cuenta de ElevenLabs. Queda en Auditoría.",
        autoCloseMs: 5000,
      });
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo guardar la llave", description: errorMessage(err) });
    }
  };

  const removeKey = async () => {
    try {
      await removeCredential.mutateAsync();
      setConfirmRemove(false);
      showAlert({
        tone: "success",
        title: "Llave retirada",
        description: "La voz vuelve a la cuenta de axi y se cobra por caracteres de su plan.",
        autoCloseMs: 5000,
      });
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo quitar la llave", description: errorMessage(err) });
    }
  };

  const configured = data.credential.configured;
  const planLabel = data.plan === null ? "Sin plan asignado" : (PLAN_TIER_LABELS[data.plan.tier] ?? data.plan.code);

  return (
    <section className="rounded-2xl border border-border bg-background p-5 md:p-6" aria-labelledby="tenant-voice-title">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="tenant-voice-title" className="flex items-center gap-2 text-lg font-medium">
            <AudioLines aria-hidden="true" className="size-[18px] text-muted-foreground" />
            Voz
          </h2>
          <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
            Quién decide si este tenant habla y con qué cuenta. El tenant elige la voz de cada agente en su estudio; aquí se
            enciende la capacidad y se guarda su llave.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck aria-hidden="true" className="size-3" />
          Solo super_admin
        </Badge>
      </header>

      <div className="rounded-xl border border-border px-4">
        <Row
          icon={data.ai_enabled ? Mic : MicOff}
          muted={!data.ai_enabled}
          title={
            <>
              Notas de voz
              <StatusDotBadge tone={data.ai_enabled ? "ok" : "off"}>{data.ai_enabled ? "Activa" : "Desactivada"}</StatusDotBadge>
            </>
          }
          description={
            data.ai_enabled ? (
              <>
                Los agentes con voz configurada responden con audio <strong className="font-medium text-foreground">solo cuando el cliente les habla con audio</strong>{" "}
                (espejo). El cambio aplica desde el siguiente mensaje.
              </>
            ) : (
              <>Este tenant atiende solo por texto. Al encenderla, sus agentes que ya tengan voz elegida responderán con audio cuando el cliente les hable con audio.</>
            )
          }
          control={
            <Switch
              checked={data.ai_enabled}
              disabled={busy}
              onCheckedChange={(value) => void toggle(value)}
              aria-label="Notas de voz de la empresa"
            />
          }
        />

        <Row
          icon={Gauge}
          muted={data.usage === null || data.usage.used === 0}
          title="Consumo del ciclo"
          description={
            data.usage === null
              ? "Sin ciclo de facturación legible todavía (tenant sin plan o recién creado)."
              : "Lo que ya gastó este tenant en caracteres de voz; el límite lo fija su plan (pestaña Plan & Límites)."
          }
        >
          {data.usage === null ? null : <UsageBar usage={data.usage} />}
        </Row>

        <Row
          icon={Layers}
          title={
            <>
              Plan
              <Badge variant={data.plan?.tier === "enterprise" ? "default" : "secondary"}>{planLabel}</Badge>
            </>
          }
          description="Contexto: a quién le estás gestionando la voz. El plan no bloquea nada aquí — la llave la decide axi."
          control={
            <Button asChild variant="ghost" size="sm">
              <Link href={`/platform/tenants/${tenantId}/plan`}>
                Ver plan
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          }
        />

        <Row
          icon={KeyRound}
          muted={!configured}
          title={
            <>
              Llave propia de ElevenLabs
              {configured ? (
                <StatusDotBadge tone="ok">Configurada · {data.credential.provider}</StatusDotBadge>
              ) : (
                <Badge variant="outline">Usa la cuenta de axi</Badge>
              )}
            </>
          }
          description={
            configured
              ? "Escríbela una vez: no se vuelve a mostrar. Mientras haya llave, la voz de este tenant se sintetiza con su cuenta, no con la de axi."
              : "Sin llave, la voz de este tenant se sintetiza con la cuenta de axi y se cobra por caracteres. Pégala aquí si el tenant contrató directo con ElevenLabs."
          }
        >
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveKey();
            }}
          >
            <label htmlFor="tenant-voice-key" className="sr-only">
              Llave de ElevenLabs
            </label>
            <Input
              id="tenant-voice-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={configured ? "Pega la llave nueva para reemplazarla" : "Pega la llave de ElevenLabs del tenant"}
              className="min-w-[260px] flex-1"
              disabled={busy}
            />
            <Button type="submit" size="sm" disabled={busy || apiKey.trim().length < KEY_MIN}>
              Guardar
            </Button>
            {configured ? (
              <Button type="button" size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => setConfirmRemove(true)}>
                <Trash2 aria-hidden="true" className="size-3.5" />
                Quitar llave
              </Button>
            ) : null}
          </form>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Se cifra al guardar y no se vuelve a mostrar · queda en Auditoría con tu usuario.
          </p>
        </Row>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Cada cambio queda en Auditoría con tu usuario: encender o apagar, guardar o quitar la llave.
      </p>

      <ConfirmTyped
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Quitar la llave de ElevenLabs"
        description="Desde el siguiente mensaje su voz se sintetiza con la cuenta de axi y se cobra por caracteres de su plan. Las voces clonadas con su cuenta dejan de estar disponibles para sus agentes. Queda en Auditoría con tu usuario."
        confirmText="QUITAR"
        actionLabel="Quitar llave"
        pending={removeCredential.isPending}
        onConfirm={removeKey}
      />
    </section>
  );
}
