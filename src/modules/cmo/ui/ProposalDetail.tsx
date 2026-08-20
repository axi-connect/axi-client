"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, BarChart3, BookOpen, Check, Clock, X } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { cn } from "@/core/lib/utils";
import { readArtifacts, type ApprovalResultDTO, type ProposalDTO } from "@/modules/cmo/domain/cmo";
import {
  artifactAction,
  artifactLabel,
  expiryLabel,
  isActionable,
  isUrgent,
  proposalKindLabel,
  proposalStatusLabel,
} from "@/modules/cmo/domain/proposal-labels";
import { getProposal } from "@/modules/cmo/infrastructure/services/cmo-service.adapter";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Motivos de rechazo frecuentes. El texto elegido es el que se guarda como
 * directriz, así que están escritos como una regla y no como una queja. */
const REJECT_REASONS = [
  "No quiero regalar margen en esta temporada.",
  "Es demasiado pronto para volver a escribirle a esa gente.",
  "Prefiero que mi equipo los contacte uno por uno.",
] as const;

/**
 * El detalle de una propuesta: donde el dueño decide.
 *
 * La anatomía es fija — titular, por qué ahora con la evidencia, qué va a pasar,
 * qué puede salir mal, los borradores — y esa rigidez es lo que construye
 * confianza. Cada bloque responde una pregunta que el dueño se hace en ese
 * orden.
 *
 * El resultado de aprobar se muestra **separando lo aplicado de lo que falló**,
 * porque casi nunca es todo o nada: la promoción se enciende y la campaña queda
 * esperando la aprobación de Meta. Un toast de "listo" mentiría.
 */
export function ProposalDetail({ proposalId }: { proposalId: string }) {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const approve = useCmoStore((state) => state.approve);
  const reject = useCmoStore((state) => state.reject);

  const [proposal, setProposal] = useState<ProposalDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApprovalResultDTO | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [asDirective, setAsDirective] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getProposal(proposalId)
      .then((data) => {
        if (alive) setProposal(data);
      })
      .catch((error: unknown) => {
        if (alive) showAlert({ tone: "error", title: errorMessage(error) });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [proposalId, showAlert]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  /**
   * `null` es un caso normal, no un error: la propuesta venció o alguien la
   * decidió desde otra pantalla mientras esta estaba abierta.
   */
  if (proposal === null) {
    return (
      <div className="p-6 text-center">
        <Clock className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold">Esta propuesta ya no está</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Venció o alguien de tu equipo la decidió. Revisa tu tablero para ver las que siguen
          pendientes.
        </p>
      </div>
    );
  }

  const artifacts = readArtifacts(proposal.artifacts);
  const canDecide = hasPermission("cmo:approve") && proposal.status === "pending";
  const actionable = isActionable(proposal.kind) && artifacts.length > 0;
  const expiry = expiryLabel(proposal.expires_at);

  const onApprove = async () => {
    setBusy(true);
    try {
      const outcome = await approve(proposal.id);
      setResult(outcome);
      setProposal({ ...proposal, status: "approved" });
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      const outcome = await reject(proposal.id, reason, asDirective);
      showAlert({
        tone: "success",
        title: outcome.directive_created ? "Anotado como directriz" : "Propuesta descartada",
        description: outcome.directive_created
          ? "Axel no te lo vuelve a proponer."
          : undefined,
      });
      setProposal({ ...proposal, status: "rejected" });
      setRejecting(false);
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex-none border-b border-border p-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-violet/30 bg-background px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-accent-violet">
            {proposalKindLabel(proposal.kind)}
          </span>
          {proposal.status !== "pending" ? (
            <span className="rounded-full border border-border px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground">
              {proposalStatusLabel(proposal.status)}
            </span>
          ) : expiry !== null ? (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold",
                isUrgent(proposal.expires_at) ? "text-warning" : "text-muted-foreground",
              )}
            >
              <Clock className="size-3" aria-hidden="true" />
              {expiry}
            </span>
          ) : null}
        </div>
        <h2 className="font-heading mt-3 text-xl leading-snug">{proposal.title}</h2>
        {proposal.headline !== null ? (
          <p className="font-heading mt-1.5 text-base font-bold text-accent-violet tabular-nums">
            {proposal.headline}
          </p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        {result !== null ? <ApprovalOutcome result={result} /> : null}

        <Block icon={BarChart3} label="Por qué ahora">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            {proposal.rationale}
          </p>
          {proposal.evidence.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-border">
              {proposal.evidence.map((item, index) => (
                <div
                  key={`${item.label}-${String(index)}`}
                  className={cn(
                    "flex items-baseline gap-2.5 px-3 py-2 text-[12.5px]",
                    index > 0 && "border-t border-border/50",
                  )}
                >
                  <span className="flex-1 text-muted-foreground">{item.label}</span>
                  <span className="font-bold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Block>

        {proposal.risks.length > 0 ? (
          <Block icon={AlertTriangle} label="Qué puede salir mal">
            {proposal.risks.map((risk) => (
              <p
                key={risk}
                className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
              >
                <AlertTriangle
                  className="mt-0.5 size-3.5 flex-none text-warning"
                  aria-hidden="true"
                />
                {risk}
              </p>
            ))}
          </Block>
        ) : null}

        {artifacts.length > 0 ? (
          <Block icon={BookOpen} label="Lo que ya está armado, apagado">
            {artifacts.map((artifact, index) => (
              <div
                key={`${artifact.type}-${String(index)}`}
                className="flex flex-col gap-2 rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold">
                    {artifactLabel(artifact.type)} · {artifact.label}
                  </span>
                  <span className="ml-auto rounded-full border border-warning/35 px-2 py-0.5 text-[10.5px] font-semibold text-warning">
                    {artifactAction(artifact.type)}
                  </span>
                </div>
                {artifact.before !== null && artifact.after !== null ? (
                  <PlaybookDiff before={artifact.before} after={artifact.after} />
                ) : null}
              </div>
            ))}
          </Block>
        ) : null}

        {rejecting ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary/40 p-3.5">
            <p className="text-[13px] font-semibold">¿Por qué no?</p>
            <div className="flex flex-col gap-2">
              {REJECT_REASONS.map((option) => (
                <label key={option} className="flex items-start gap-2.5 text-[12.5px]">
                  <input
                    type="radio"
                    name="reject-reason"
                    checked={reason === option}
                    onChange={() => {
                      setReason(option);
                    }}
                    className="mt-0.5 accent-accent-violet"
                  />
                  {option}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[11.5px] text-accent-violet">
              <input
                type="checkbox"
                checked={asDirective}
                onChange={(event) => {
                  setAsDirective(event.target.checked);
                }}
                className="accent-accent-violet"
              />
              Guardarlo como directriz para que no me lo vuelva a proponer
            </label>
          </div>
        ) : null}
      </div>

      {canDecide ? (
        <footer className="flex flex-none items-center gap-2.5 border-t border-border bg-secondary/40 p-3.5">
          {rejecting ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void onReject();
                }}
              >
                Descartar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setRejecting(false);
                }}
              >
                Volver
              </Button>
            </>
          ) : (
            <>
              {actionable ? (
                <Button
                  className="bg-brand-gradient text-primary-foreground"
                  disabled={busy}
                  onClick={() => {
                    void onApprove();
                  }}
                >
                  <Check className="size-4" aria-hidden="true" />
                  Aprobar y encender
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="ml-auto"
                disabled={busy}
                onClick={() => {
                  setRejecting(true);
                }}
              >
                <X className="size-4" aria-hidden="true" />
                {actionable ? "No, gracias" : "Descartar"}
              </Button>
            </>
          )}
        </footer>
      ) : null}
    </div>
  );
}

function Block({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof BarChart3;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2 text-[10.5px] font-bold tracking-widest uppercase text-muted-foreground/70">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </h3>
      {children}
    </section>
  );
}

/**
 * El antes/después del guion de ventas. Se muestra completo y no como un diff
 * por líneas: el texto es prosa corta y un diff de palabras haría más difícil
 * leer qué va a decir el agente, que es lo único que el dueño necesita juzgar.
 */
function PlaybookDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border text-[12.5px] leading-relaxed">
      <div className="flex gap-2.5 bg-destructive/6 p-2.5">
        <span className="w-12 flex-none pt-0.5 text-[9.5px] font-bold tracking-wider uppercase text-destructive">
          Hoy
        </span>
        <span className="text-muted-foreground">{before === "" ? "(vacío)" : before}</span>
      </div>
      <div className="flex gap-2.5 border-t border-border/50 bg-success/6 p-2.5">
        <span className="w-12 flex-none pt-0.5 text-[9.5px] font-bold tracking-wider uppercase text-success">
          Nuevo
        </span>
        <span>{after}</span>
      </div>
    </div>
  );
}

/**
 * Qué pasó al aprobar. Las dos listas van separadas porque el caso frecuente no
 * es "todo bien" ni "todo mal": es la promoción encendida y la campaña esperando
 * que Meta apruebe su plantilla. Decirlo con un booleano obligaría al dueño a ir
 * a buscar qué quedó a medias.
 */
function ApprovalOutcome({ result }: { result: ApprovalResultDTO }) {
  return (
    <div className="flex flex-col gap-2.5">
      {result.applied.length > 0 ? (
        <div className="flex gap-2.5 rounded-md border border-success/40 bg-success/8 p-3 text-[12.5px]">
          <Check className="mt-0.5 size-4 flex-none text-success" aria-hidden="true" />
          <div>
            <p className="font-semibold">Encendido</p>
            <ul className="mt-1 text-muted-foreground">
              {result.applied.map((item) => (
                <li key={`${item.type}-${item.label}`}>
                  {artifactLabel(item.type)} · {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {result.failed.length > 0 ? (
        <div className="flex gap-2.5 rounded-md border border-warning/40 bg-warning/8 p-3 text-[12.5px]">
          <AlertTriangle className="mt-0.5 size-4 flex-none text-warning" aria-hidden="true" />
          <div>
            <p className="font-semibold">Quedó pendiente</p>
            <ul className="mt-1 flex flex-col gap-1 text-muted-foreground">
              {result.failed.map((item) => (
                <li key={`${item.type}-${item.label}`}>
                  <span className="font-medium">{artifactLabel(item.type)}</span>: {item.reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {result.applied.length === 0 && result.failed.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-border p-3 text-[12.5px] text-muted-foreground">
          <ArrowUpRight className="size-4 flex-none" aria-hidden="true" />
          No había nada que encender en esta propuesta.
        </p>
      ) : null}
    </div>
  );
}
