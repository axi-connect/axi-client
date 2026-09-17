"use client";

import { useState } from "react";
import { ArrowRight, Ban, Check, Copy, Mic, RefreshCw, Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { SESSION_STATUS_LABELS } from "../../../domain/intake";
import {
  useApplyIntakeSession,
  useCancelIntakeSession,
  useIntakeApplyPlanQuery,
  useIntakeSessionQuery,
  useReissueIntakeLink,
} from "../../../infrastructure/api/hooks/use-intake";
import { ProblemAlert } from "../../components/ProblemAlert";

/**
 * La ficha de una entrevista: lo recogido, la conversación y el aplicador.
 *
 * El orden de las pestañas es una postura: **«Lo recogido» va primero** porque
 * es lo que se necesita para decidir, y la conversación es la evidencia por si
 * algo no cuadra. Al revés se leería el chat entero cada vez.
 */
export function IntakeSessionSheet({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { data, isPending, isError, error, refetch } = useIntakeSessionQuery(sessionId);

  return (
    <Sheet
      open={sessionId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isPending || data === undefined ? (
          isError ? (
            <div className="p-6">
              <ProblemAlert error={error} onRetry={() => void refetch()} />
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
          )
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{data.company_name ?? "Empresa"}</SheetTitle>
              <SheetDescription>
                {data.invite_name ?? "Sin destinatario"} · {data.blueprint_name} v
                {data.blueprint_version} · {SESSION_STATUS_LABELS[data.status]} · {data.percent}%
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-6">
              <SessionActions sessionId={data.id} status={data.status} />

              <Tabs defaultValue="answers" className="mt-4">
                <TabsList>
                  <TabsTrigger value="answers">Lo recogido</TabsTrigger>
                  <TabsTrigger value="apply">Aplicar</TabsTrigger>
                  <TabsTrigger value="transcript">Conversación</TabsTrigger>
                </TabsList>

                <TabsContent value="answers" className="mt-4">
                  {data.topics.map((topic) => (
                    <section key={topic.code} className="mb-5">
                      <h3 className="mb-1 text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground/80 uppercase">
                        {topic.title}
                        {topic.deferred ? " · lo dejaron para después" : ""}
                      </h3>
                      <dl>
                        {topic.fields.map((field) => (
                          <div
                            key={field.code}
                            className="flex items-start justify-between gap-4 border-b border-border-soft py-2 last:border-b-0"
                          >
                            <dt className="w-40 flex-none text-[12px] text-muted-foreground">
                              {field.label}
                            </dt>
                            <dd className="min-w-0 flex-1 text-[13px] wrap-anywhere">
                              {field.display ?? (
                                <span className="text-muted-foreground/50 italic">
                                  Sin contestar
                                </span>
                              )}
                              {field.source === "derived" ? (
                                <span className="ml-2 inline-flex items-center gap-1 text-[10.5px] text-accent-violet">
                                  <Sparkles className="size-2.5" aria-hidden="true" />
                                  sin confirmar
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </TabsContent>

                <TabsContent value="apply" className="mt-4">
                  <ApplyPanel sessionId={data.id} applied={data.status === "applied"} />
                </TabsContent>

                <TabsContent value="transcript" className="mt-4">
                  <ol className="space-y-3">
                    {data.transcript.map((message, index) => (
                      <li
                        key={index}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap wrap-anywhere",
                          message.role === "assistant"
                            ? "border-border bg-background"
                            : "ml-8 border-border bg-secondary/50",
                        )}
                      >
                        <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-foreground">
                          {message.role === "assistant" ? "Asistente" : "Cliente"}
                          {message.voice ? (
                            <span className="inline-flex items-center gap-1 font-normal">
                              <Mic className="size-2.5" aria-hidden="true" />
                              dictado
                            </span>
                          ) : null}
                        </p>
                        {message.body}
                      </li>
                    ))}
                  </ol>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SessionActions({ sessionId, status }: { sessionId: string; status: string }) {
  const reissue = useReissueIntakeLink();
  const cancel = useCancelIntakeSession();
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={status === "cancelled" || reissue.isPending}
          onClick={() => {
            reissue.mutate(sessionId);
          }}
        >
          <RefreshCw aria-hidden="true" />
          Reemitir enlace
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={status === "cancelled" || cancel.isPending}
          onClick={() => {
            cancel.mutate(sessionId);
          }}
        >
          <Ban aria-hidden="true" />
          Cancelar
        </Button>
      </div>

      {reissue.data === undefined ? null : (
        <div className="space-y-1">
          <div className="flex gap-2">
            <Input readOnly value={reissue.data.url} className="font-mono text-[11px]" />
            <Button
              variant="outline"
              size="icon"
              className="flex-none"
              onClick={() => {
                void navigator.clipboard.writeText(reissue.data.url).then(() => {
                  setCopied(true);
                  window.setTimeout(() => {
                    setCopied(false);
                  }, 1600);
                });
              }}
              aria-label="Copiar enlace"
            >
              {copied ? (
                <Check className="size-4 text-success" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            El enlace anterior dejó de servir. Este solo se ve ahora.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * El aplicador, en dos pasos: **ver qué pasaría** y **hacerlo**.
 *
 * Los dos pasos no son burocracia. Escribir en la configuración de una empresa
 * real a partir de lo que entendió un modelo es exactamente el tipo de acción
 * que hay que proponer y no ejecutar: el patrón de las plataformas serias de
 * onboarding agéntico es que el agente redacta, expone lo que va a hacer, y una
 * persona aprueba. Agéntico no significa autónomo.
 *
 * Lo saltado se enseña con su motivo y a la misma altura que lo aplicado. Un
 * «deducido de su web y sin confirmar» escondido sería justo el dato que nadie
 * revisa y que después nadie entiende por qué no se escribió.
 */
function ApplyPanel({ sessionId, applied }: { sessionId: string; applied: boolean }) {
  const plan = useIntakeApplyPlanQuery(sessionId, !applied);
  const apply = useApplyIntakeSession();

  if (applied) {
    return (
      <p className="rounded-md border border-success/30 bg-success/6 px-3 py-2.5 text-[13px]">
        Esta entrevista ya se aplicó. Lo que se escribió queda en el recibo de la sesión y en la
        auditoría de plataforma.
      </p>
    );
  }

  if (plan.isPending) return <p className="text-sm text-muted-foreground">Calculando…</p>;
  if (plan.isError) {
    return <ProblemAlert error={plan.error} onRetry={() => void plan.refetch()} />;
  }

  const changes = apply.data?.applied ?? plan.data.changes;
  const skipped = apply.data?.skipped ?? plan.data.skipped;
  const done = apply.isSuccess;

  return (
    <div className="space-y-4">
      {changes.length === 0 ? (
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-[13px] text-muted-foreground">
          No hay nada aplicable todavía: ningún dato confirmado apunta a la configuración del
          tenant.
        </p>
      ) : (
        <section>
          <h4 className="mb-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {done ? "Se escribió" : "Se va a escribir"}
          </h4>
          <ul className="divide-y divide-border-soft rounded-md border border-border">
            {changes.map((change) => (
              <li key={change.target} className="px-3 py-2">
                <p className="text-[12px] font-medium">{change.label}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className="text-muted-foreground line-through">
                    {change.before ?? "vacío"}
                  </span>
                  <ArrowRight className="size-3 flex-none text-muted-foreground" aria-hidden="true" />
                  <span className="text-foreground">{change.after}</span>
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                  {change.target}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {skipped.length === 0 ? null : (
        <section>
          <h4 className="mb-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            No se toca
          </h4>
          <ul className="space-y-1">
            {skipped.map((item) => (
              <li key={item.target} className="flex justify-between gap-3 text-[12px]">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="flex-none text-muted-foreground/70">{item.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {apply.isError ? (
        <p className="text-sm text-destructive">{errorMessage(apply.error)}</p>
      ) : null}

      {done ? (
        <p className="flex items-center gap-1.5 text-[13px] text-success">
          <Check className="size-4" aria-hidden="true" />
          Aplicado.
        </p>
      ) : (
        <Button
          className="w-full"
          disabled={changes.length === 0 || apply.isPending}
          onClick={() => {
            apply.mutate(sessionId);
          }}
        >
          {apply.isPending
            ? "Aplicando…"
            : `Aplicar ${String(changes.length)} ${changes.length === 1 ? "cambio" : "cambios"}`}
        </Button>
      )}
    </div>
  );
}
