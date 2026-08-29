"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle, RefreshCw, WandSparkles, X } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";

import {
  LEAD_STATUS_MAP,
  LEGAL_BASIS_LABELS,
  QUALITY_STATUS_MAP,
  SOURCE_LABELS,
  canDiscard,
  canPromote,
  leadDisplayName,
  type LeadDetailDTO,
} from "../domain/lead";
import {
  discardLead,
  enrichLead,
  getLead,
  promoteLeads,
  verifyLead,
} from "../infrastructure/services/prospecting-service.adapter";
import { ChannelPermissions } from "./components/ChannelPermissions";
import { LeadIdentityCard } from "./components/LeadIdentityCard";
import { LeadProvenance } from "./components/LeadProvenance";
import { LeadTimeline } from "./components/LeadTimeline";
import { PromotionGate } from "./components/PromotionGate";
import { QualityBreakdown } from "./components/QualityIndex";

/** Cada cuánto se recarga mientras se buscan datos, y cuándo nos rendimos. */
const POLL_MS = 5_000;
const POLL_TIMEOUT_MS = 90_000;

export function LeadDetailView({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();

  const [lead, setLead] = useState<LeadDetailDTO | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * El `last_enriched_at` que había al pedir la búsqueda. Mientras no cambie,
   * el trabajo sigue en curso. `undefined` = no hay nada pedido.
   */
  const [enrichingSince, setEnrichingSince] = useState<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setLead(await getLead(leadId));
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No pudimos abrir el lead",
        description: errorMessage(caught, ""),
      });
      router.replace("/marketing/leads");
    }
  }, [leadId, router, showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  const working = enrichingSince !== undefined && lead?.last_enriched_at === enrichingSince;

  /**
   * Sondeo mientras se buscan los datos. No hay evento de tiempo real por lead
   * —solo de búsqueda—, y para una acción que el usuario acaba de pedir y está
   * mirando, recargar cada pocos segundos basta.
   *
   * El tope NO es opcional: si un proveedor se cuelga, el trabajo puede no
   * terminar nunca, y un spinner girando sobre algo parado miente igual que un
   * estado sin barrido. A los 90 segundos se rinde y lo dice.
   */
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => void load(), POLL_MS);
    const giveUp = setTimeout(() => {
      setEnrichingSince(undefined);
      showAlert({
        tone: "warning",
        title: "La búsqueda está tardando",
        description: "Sigue en curso. Recarga en un momento para ver si llegó algo.",
      });
    }, POLL_TIMEOUT_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(giveUp);
    };
  }, [working, load, showAlert]);

  // Llegaron datos nuevos: se deja de sondear y se dice qué cambió.
  useEffect(() => {
    if (enrichingSince === undefined || working) return;
    setEnrichingSince(undefined);
    showAlert({
      tone: "success",
      title: "Datos actualizados",
      description: "Abajo tienes lo que encontramos y de qué fuente salió cada cosa.",
    });
  }, [enrichingSince, working, showAlert]);

  const onPromote = useCallback(async () => {
    setBusy(true);
    try {
      const result = await promoteLeads([leadId]);
      const failure = result.failed[0];
      if (failure !== undefined) {
        showAlert({
          tone: "error",
          title: "No se pudo promover",
          description: failure.reason,
        });
      } else {
        showAlert({
          tone: "success",
          title: "Lead promovido",
          description:
            "Ya es un contacto de tu CRM y tu agente puede atenderlo.",
        });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }, [leadId, load, showAlert]);

  /**
   * Buscarle los datos que le faltan.
   *
   * Responde 202 y el trabajo sigue en una cola, así que no hay nada que
   * esperar en la petición: se marca «buscando» a mano y se recarga cada pocos
   * segundos hasta que `last_enriched_at` cambie. No se toca `lead.status` —
   * ese es el ciclo de vida del lead y el servidor nunca escribe `enriching`;
   * lo transitorio es nuestra petición, no la vida del lead.
   */
  const onEnrich = useCallback(async () => {
    setBusy(true);
    try {
      await enrichLead(leadId);
      setEnrichingSince(lead?.last_enriched_at ?? null);
      showAlert({
        tone: "info",
        title: "Buscando datos",
        description:
          "Estamos preguntando a las fuentes. Los datos aparecen aquí en cuanto lleguen.",
      });
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo pedir la búsqueda",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    } finally {
      setBusy(false);
    }
  }, [leadId, lead?.last_enriched_at, showAlert]);

  /**
   * Volver a puntuar este lead. SÍ puede gastar cuota —por eso pide
   * `leads:manage`— y se dice en el botón: quien lo pulsa está pidiendo que se
   * pague por saber.
   */
  const onVerify = useCallback(async () => {
    setBusy(true);
    try {
      const result = await verifyLead(leadId);
      showAlert({
        tone: "success",
        title: `Puntaje actualizado: ${String(result.score)}`,
        description: "Abajo tienes la evidencia de cada señal.",
      });
      await load();
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo verificar",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    } finally {
      setBusy(false);
    }
  }, [leadId, load, showAlert]);

  const onDiscard = useCallback(async () => {
    setBusy(true);
    try {
      await discardLead(leadId);
      showAlert({
        tone: "success",
        title: "Lead descartado",
        description: "Ya no aparecerá en tu bandeja.",
      });
      router.push("/marketing/leads");
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo descartar",
        description: errorMessage(caught, ""),
      });
    } finally {
      setBusy(false);
    }
  }, [leadId, router, showAlert]);

  if (lead === null) return <BrandLoader label="Cargando lead" />;

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="mb-4"
        onClick={() => router.push("/marketing/leads")}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a la bandeja
      </Button>

      <header className="mb-5 flex flex-wrap items-start gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold">
            {leadDisplayName(lead)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge
              status={lead.quality_status}
              map={QUALITY_STATUS_MAP}
            />
            <StatusBadge status={lead.status} map={LEAD_STATUS_MAP} />
            <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
              {LEGAL_BASIS_LABELS[lead.legal_basis]}
            </span>
            <ChannelPermissions
              lead={{
                allowed_channels: lead.allowed_channels,
                legal_basis: lead.legal_basis,
                // El detalle SÍ tiene los valores: pasarlos es lo que
                // distingue «no te dejan» de «no lo tenemos».
                email: lead.email,
                phone: lead.phone,
              }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {SOURCE_LABELS[lead.source]} · descubierto el{" "}
            {formatShortDate(lead.created_at)}
          </p>
        </div>

        <div className="ml-auto flex gap-2">
          {/* Buscar datos va PRIMERO y en primario: para un lead a medio
              llenar es la acción que desbloquea a las otras dos. */}
          {hasPermission("leads:manage") && (
            <Button size="sm" disabled={busy || working} onClick={() => void onEnrich()}>
              {working ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <WandSparkles aria-hidden className="size-4" />
              )}
              {working ? "Buscando…" : "Buscar datos"}
            </Button>
          )}
          {hasPermission("leads:manage") && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || working}
              onClick={() => void onVerify()}
            >
              <RefreshCw className="size-4" aria-hidden />
              Volver a revisar
            </Button>
          )}
          {canDiscard(lead) && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void onDiscard()}
            >
              <X className="size-4" aria-hidden />
              Descartar
            </Button>
          )}
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-5">
          {/* Los datos primero: es lo que se viene a ver. El índice y la
              procedencia explican y matizan, pero no son la respuesta. */}
          <LeadIdentityCard lead={lead} />
          <section className="border-border shadow-float bg-background rounded-lg border p-5">
            <QualityBreakdown
              score={lead.quality_score}
              signals={lead.quality_signals}
            />
          </section>
          <section className="border-border shadow-float bg-background rounded-lg border p-5">
            <LeadProvenance lead={lead} />
          </section>
        </div>

        <div className="flex flex-col gap-5">
          {canPromote(lead) && hasPermission("leads:promote") && (
            <PromotionGate
              lead={lead}
              busy={busy}
              onPromote={() => void onPromote()}
            />
          )}
          {lead.status === "promoted" && lead.contact_id !== null && (
            <section className="border-success/35 bg-success/[0.06] rounded-lg border p-4">
              <p className="text-success flex items-center gap-2 text-sm font-semibold">
                <Check className="size-4" aria-hidden />
                Ya es un contacto de tu CRM
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a href={`/crm/contacts/${lead.contact_id}`}>Ver en el CRM</a>
              </Button>
            </section>
          )}
          <section className="border-border shadow-float bg-background rounded-lg border p-5">
            <LeadTimeline events={lead.events} />
          </section>
        </div>
      </div>
    </div>
  );
}
