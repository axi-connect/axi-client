"use client";

/**
 * Alta de una sesión de simulacro: tenant (suspendidos deshabilitados), agente
 * activo, nota de persona solo para el operador y tope de la sesión (el diario
 * global aplica encima). El 201 devuelve el id y la vista navega a la sesión.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, MessageSquarePlus, Play } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  describeSessionError,
  formatUsd,
  PERSONA_NOTE_MAX,
  SESSION_CAP_USD_DEFAULT,
  SESSION_CAP_USD_MAX,
} from "../../../../../domain/quality-sessions";
import { useCreateSession } from "../../../../../infrastructure/api/hooks/use-quality-sessions";
import { TenantSelect } from "../../../../components/TenantSelect";
import { AgentSelect } from "../../shared/AgentSelect";

type NewSessionFormProps = {
  /** Preselección («Nueva sesión igual» desde una sesión terminada). */
  initial?: { companyId: string; agentId: string; personaNote?: string | null };
};

export function NewSessionForm({ initial }: NewSessionFormProps) {
  const router = useRouter();
  const createSession = useCreateSession();
  const [companyId, setCompanyId] = useState<string | null>(initial?.companyId ?? null);
  const [agentId, setAgentId] = useState<string | null>(initial?.agentId ?? null);
  const [personaNote, setPersonaNote] = useState(initial?.personaNote ?? "");
  const [cap, setCap] = useState(String(SESSION_CAP_USD_DEFAULT));

  const capValue = Number(cap.replace(",", "."));
  const capValid = Number.isFinite(capValue) && capValue > 0 && capValue <= SESSION_CAP_USD_MAX;
  const canSubmit = Boolean(companyId && agentId) && capValid && !createSession.isPending;

  const error = createSession.error;
  const problem = isHttpError(error) ? error.problem : null;
  const friendly = describeSessionError(problem) ?? (error ? errorMessage(error) : null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !agentId || !canSubmit) return;
    createSession.mutate(
      {
        company_id: companyId,
        agent_id: agentId,
        ...(personaNote.trim() ? { persona_note: personaNote.trim() } : {}),
        spend_cap_usd: capValue,
      },
      { onSuccess: ({ id }) => router.push(`/platform/quality/simulator/${id}`) },
    );
  };

  return (
    <form onSubmit={submit} className="mx-auto my-auto w-full max-w-lg space-y-5 rounded-2xl border border-border bg-background p-6 [@media(max-height:760px)]:space-y-4 [@media(max-height:760px)]:p-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <MessageSquarePlus aria-hidden="true" className="size-4.5" />
          Nueva sesión
        </h2>
        <p className="text-sm text-muted-foreground">
          Habla con el agente de un tenant como si fueras su cliente. Es el pipeline real, no una vista previa.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="session-tenant">Tenant *</Label>
        <TenantSelect
          value={companyId ?? ""}
          onValueChange={(value) => {
            setCompanyId(value);
            setAgentId(null);
          }}
          disableSuspended
          className="w-full"
          ariaLabel="Tenant del simulacro"
          placeholder="Elige el tenant"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session-agent">Agente *</Label>
        <AgentSelect companyId={companyId} value={agentId} onValueChange={setAgentId} />
        <p className="text-xs text-muted-foreground">
          Solo agentes activos; los clones internos de QA no aparecen.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session-persona">Nota de persona (opcional)</Label>
        <Textarea
          id="session-persona"
          value={personaNote}
          onChange={(event) => setPersonaNote(event.target.value.slice(0, PERSONA_NOTE_MAX))}
          placeholder="Ej.: cliente apurado que ya vio el producto en Instagram y quiere pagar hoy"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Solo para ti: el agente no la ve. Sirve para recordar qué probabas.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session-cap">Tope de gasto de la sesión (USD)</Label>
        <div className="relative">
          <CircleDollarSign aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="session-cap"
            inputMode="decimal"
            value={cap}
            onChange={(event) => setCap(event.target.value)}
            aria-invalid={!capValid}
            className="pl-9 tabular-nums"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Máximo {formatUsd(SESSION_CAP_USD_MAX)}; el server lo acota a su tope de plataforma. El tope diario global aplica encima. Al tocarlo la sesión se cierra con aviso.
        </p>
      </div>

      {friendly && (
        <Alert variant="destructive">
          <AlertDescription>{friendly}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={!canSubmit}>
          <Play aria-hidden="true" />
          {createSession.isPending ? "Abriendo…" : "Iniciar sesión"}
        </Button>
      </div>
    </form>
  );
}
