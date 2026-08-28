"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";

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
  getLead,
  promoteLeads,
} from "../infrastructure/services/prospecting-service.adapter";
import { ChannelPermissions } from "./components/ChannelPermissions";
import { LeadProvenance } from "./components/LeadProvenance";
import { LeadTimeline } from "./components/LeadTimeline";
import { PromotionGate } from "./components/PromotionGate";
import { QualityBreakdown } from "./components/QualityIndex";

export function LeadDetailView({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();

  const [lead, setLead] = useState<LeadDetailDTO | null>(null);
  const [busy, setBusy] = useState(false);

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
              }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {SOURCE_LABELS[lead.source]} · descubierto el{" "}
            {formatShortDate(lead.created_at)}
          </p>
        </div>

        {canDiscard(lead) && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={busy}
            onClick={() => void onDiscard()}
          >
            <X className="size-4" aria-hidden />
            Descartar
          </Button>
        )}
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-5">
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
