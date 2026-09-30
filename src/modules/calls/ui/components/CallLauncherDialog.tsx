"use client";

import { Ear, LoaderCircle, Megaphone, PhoneOutgoing } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { getTenantAgents, type AssignableAgent } from "@/modules/agents/public";
import { MODE_HINTS, MODE_LABELS, type CallMode } from "@/modules/calls/domain/call";
import { CALL_TYPE_LABELS, PROACTIVE_CALL_TYPES, type ProactiveCallType } from "@/modules/calls/domain/playbooks";
import { launchCall, placeTestCall } from "@/modules/calls/infrastructure/services/calls-service.adapter";

const DEFAULT_AGENT = "__default__";

/** Por qué no salió la llamada (`calls/launch_skipped` → `details.reason`), en palabras. */
const SKIP_REASONS: Record<string, string> = {
  already_in_call: "Este contacto ya está al teléfono con tu agente. Espera a que termine.",
  contact_unreachable: "El contacto no tiene un teléfono al que llamar.",
  no_phone_number: "Tu empresa aún no tiene un número de llamadas asignado.",
  no_agent: "No hay un agente activo que pueda hacer la llamada.",
  calls_disabled: "Las llamadas con IA están apagadas en Configuración.",
  company_suspended: "La cuenta está suspendida: las llamadas no pueden salir.",
  calls_paused: "Se agotaron los minutos del plan en este ciclo.",
  limit_exceeded: "Se agotaron los minutos del plan en este ciclo.",
};

export type CallLauncherTarget =
  /** Un contacto del CRM: `POST /calls/launch`, idempotente. */
  | { kind: "contact"; contact_id: string; name: string | null; phone: string | null }
  /** Un número suelto (banco de pruebas del Monitoreo): `POST /calls/test-call`. */
  | { kind: "number" };

/**
 * «Llamar» (plan de modos §7): UN diálogo para el Monitoreo, la ficha del
 * contacto, el panel de llamadas del inbox y Cobros. Pide lo mínimo: tipo,
 * agente, objetivo (opcional, prellenado por quien abre) y modo. El marco del
 * tipo hace el resto. Un doble clic nunca origina dos llamadas: la clave de
 * idempotencia es la misma durante todo el diálogo.
 */
export function CallLauncherDialog({
  open,
  onOpenChange,
  target,
  defaultType = "followup",
  defaultObjective = "",
  onLaunched,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CallLauncherTarget;
  defaultType?: ProactiveCallType;
  defaultObjective?: string;
  onLaunched?: (callSessionId: string) => void;
}) {
  const { showAlert } = useAlert();
  const [to, setTo] = useState("");
  const [type, setType] = useState<ProactiveCallType>(defaultType);
  const [mode, setMode] = useState<CallMode>("proactive");
  const [agentId, setAgentId] = useState(DEFAULT_AGENT);
  const [objective, setObjective] = useState(defaultObjective);
  const [agents, setAgents] = useState<AssignableAgent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Una clave por apertura del diálogo: reintentar o hacer doble clic devuelve la MISMA llamada.
  const idempotencyKey = useMemo(() => (open ? crypto.randomUUID() : ""), [open]);

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setObjective(defaultObjective);
    setMode("proactive");
    setAgentId(DEFAULT_AGENT);
    setProblem(null);
    let alive = true;
    getTenantAgents()
      .then((list) => {
        if (alive) setAgents(list);
      })
      .catch(() => undefined); // sin lista, el agente del número
    return () => {
      alive = false;
    };
  }, [open, defaultType, defaultObjective]);

  const needsNumber = target.kind === "number";
  const canSubmit = !submitting && (!needsNumber || to.trim().length >= 7);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setProblem(null);
    const common = {
      call_type: type,
      mode,
      objective: objective.trim() || undefined,
      ai_agent_id: agentId === DEFAULT_AGENT ? undefined : agentId,
    };
    try {
      const { call_session_id } =
        target.kind === "contact"
          ? await launchCall({ contact_id: target.contact_id, ...common }, idempotencyKey)
          : await placeTestCall({ to: to.trim(), ...common });
      showAlert({
        tone: "success",
        title: "Llamada en camino",
        description: "Aparece en el Monitoreo al conectar. Consume minutos del plan.",
      });
      onLaunched?.(call_session_id);
      onOpenChange(false);
      setTo("");
    } catch (error) {
      const reason = isHttpError(error) ? (error.problem?.details?.reason as unknown) : undefined;
      setProblem(typeof reason === "string" && reason in SKIP_REASONS ? SKIP_REASONS[reason] ?? null : errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const title = target.kind === "contact" ? `Llamar a ${target.name ?? target.phone ?? "este contacto"}` : "Llamar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Tu agente llama ahora por el mismo camino que cualquier llamada: aviso de grabación, conversación y
            transcripción. Se descuenta de los minutos del plan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {target.kind === "contact" ? (
            <p className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
              <span className="min-w-0 truncate font-medium">{target.name ?? "Contacto sin nombre"}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{target.phone ?? "sin teléfono"}</span>
            </p>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="launch-to">Número de destino</Label>
              <Input
                id="launch-to"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="+57 300 123 4567"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="launch-type">Tipo de llamada</Label>
              <Select value={type} onValueChange={(value: string) => setType(value as ProactiveCallType)}>
                <SelectTrigger id="launch-type" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROACTIVE_CALL_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {CALL_TYPE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="launch-agent">Agente</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger id="launch-agent" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_AGENT}>El del número</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="launch-objective">Objetivo (opcional)</Label>
            <Input
              id="launch-objective"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Ej.: retomar la cotización de blanqueamiento"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Lo concreto de esta llamada. El marco del tipo hace el resto.</p>
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Modo</legend>
            <div role="radiogroup" aria-label="Modo de la llamada" className="grid gap-2 sm:grid-cols-2">
              {(["proactive", "reactive"] as const).map((item) => {
                const Icon = item === "proactive" ? Megaphone : Ear;
                const checked = mode === item;
                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setMode(item)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      checked ? "border-brand/60 bg-brand/[0.05]" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Icon aria-hidden className={cn("size-4", checked ? "text-accent-violet" : "text-muted-foreground")} />
                      {MODE_LABELS[item]}
                    </span>
                    <span className="text-xs text-muted-foreground">{MODE_HINTS[item]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {problem !== null && (
            <p role="alert" className="rounded-xl bg-muted px-3 py-2.5 text-sm">
              {problem}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {submitting ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <PhoneOutgoing aria-hidden className="size-4" />
            )}
            Llamar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
