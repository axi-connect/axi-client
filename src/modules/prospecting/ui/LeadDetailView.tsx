"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { socketManager } from "@/core/realtime/socket-manager";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, RefreshCw, UsersRound, WandSparkles, X } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";

import {
  LEAD_STATUS_MAP,
  LEGAL_BASIS_LABELS,
  QUALITY_STATUS_MAP,
  SOURCE_LABELS,
  canDiscard,
  canPromote,
  isRunInFlight,
  leadDisplayName,
  type EnrichmentRunDTO,
  type LeadDetailDTO,
} from "../domain/lead";
import {
  BUYING_ROLE_LABELS,
  NO_REVEAL_COSTS,
  PROMOTED_WITH_BUSINESS,
  type LeadPersonDTO,
  type LeadSignalDTO,
  type RevealCosts,
} from "../domain/person";
import {
  discardLead,
  enrichLead,
  findPeopleForLead,
  getLead,
  getLeadSignals,
  listMyProviderKeys,
  promoteLeads,
  revealLeads,
  verifyLead,
} from "../infrastructure/services/prospecting-service.adapter";
import { BulkFollowUpButton } from "@/modules/crm/ui/components/BulkFollowUpButton";
import { ChannelPermissions } from "./components/ChannelPermissions";
import { EnrichmentRunCard } from "./components/EnrichmentRunCard";
import { LeadIdentityCard } from "./components/LeadIdentityCard";
import { LeadPeopleSection } from "./components/LeadPeopleSection";
import { LeadProvenance } from "./components/LeadProvenance";
import { LeadTimeline } from "./components/LeadTimeline";
import { PromotionGate } from "./components/PromotionGate";
import { QualityBreakdown } from "./components/QualityIndex";
import { RevealButtons } from "./components/RevealButtons";

/**
 * Cada cuánto se relee la fila mientras hay una pasada viva.
 *
 * Es el RESPALDO del WebSocket, no el mecanismo — y ya no hace falta un tope de
 * rendición: antes la interfaz adivinaba si había terminado mirando una marca
 * de tiempo, y como esa marca no cambiaba al no encontrar nada, el spinner
 * giraba para siempre. Ahora la pasada dice cuándo terminó.
 */
const POLL_MS = 5_000;

export function LeadDetailView({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();

  const [lead, setLead] = useState<LeadDetailDTO | null>(null);
  /** No se pudo abrir: se dice aquí con «Reintentar», en vez de echar a la bandeja con un aviso que se va. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * La pasada en curso. Sale de la fila al cargar y la adelanta el WebSocket.
   *
   * Sustituye al truco anterior —comparar `last_enriched_at` para adivinar si
   * había terminado—, que no podía distinguir «no encontró nada» de «sigue
   * trabajando» y dejaba el spinner girando para siempre.
   */
  const [run, setRun] = useState<EnrichmentRunDTO | null>(null);
  // P2: personas del negocio, sus señales y lo que cuesta revelar.
  const [peopleRefresh, setPeopleRefresh] = useState(0);
  const [people, setPeople] = useState<LeadPersonDTO[]>([]);
  const [signals, setSignals] = useState<LeadSignalDTO[]>([]);
  const [costs, setCosts] = useState<RevealCosts>(NO_REVEAL_COSTS);
  const [waitingPhone, setWaitingPhone] = useState(false);
  const { socket } = useSocket("inbox");
  const joinedRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fresh = await getLead(leadId);
      setLead(fresh);
      setRun(fresh.last_run);
      setLoadError(null);
    } catch (caught) {
      // Con la ficha ya abierta, un fallo al refrescar no la tira: se conservan los datos que había.
      setLoadError(errorMessage(caught, "Revisa tu conexión e intenta otra vez."));
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  // P2: las señales del negocio y los créditos de revelar. Fallar aquí no
  // tumba la ficha: la ficha sin señales sigue siendo la ficha.
  const isBusiness = lead?.kind === "business";
  useEffect(() => {
    if (!isBusiness) return;
    getLeadSignals(leadId)
      .then((result) => setSignals(result.items))
      .catch(() => setSignals([]));
  }, [isBusiness, leadId, peopleRefresh]);
  useEffect(() => {
    listMyProviderKeys()
      .then((result) => setCosts(result.items.find((item) => item.provider === "apollo")?.credit_costs ?? NO_REVEAL_COSTS))
      .catch(() => setCosts(NO_REVEAL_COSTS));
  }, []);

  const working = isRunInFlight(run);

  /**
   * Suscripción al detalle de ESTE lead, y solo mientras la ficha está abierta.
   *
   * El join se marca SOLO tras el ack: darlo por bueno antes daba por hecho un
   * join que pudo fallar por permisos o por timeout, y no se reintentaba nunca.
   *
   * Depende SOLO de `socket`, jamás de `connected`. Con la dependencia ingenua
   * el ciclo era: se desconecta → el cleanup quita el listener → el cuerpo sale
   * por el guard → llega el `connect` sin nadie escuchando, y el socket se
   * queda fuera de la sala para siempre. El token rota cada ~14 minutos con
   * desconexión, así que pasaría siempre.
   */
  useEffect(() => {
    if (socket === null) return;

    const join = () => {
      socketManager
        .emitWithAck(socket, "inbox.join_lead", { lead_id: leadId })
        .then((ack) => {
          if (ack.ok) joinedRef.current = leadId;
        })
        .catch(() => {
          // Timeout: `joinedRef` queda sin fijar y el próximo `connect` reintenta.
        });
    };

    join();
    // La membresía del room muere con la conexión: olvidarla obliga a
    // re-unirse en vez de dar por hecho que sigue vigente.
    const onConnect = () => {
      join();
      // Lo que pasó mientras el socket estuvo caído no llegó a nadie: se
      // recarga la fila, que es la verdad.
      void load();
    };
    const onDisconnect = () => {
      joinedRef.current = null;
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      if (joinedRef.current !== null) {
        const leaving = joinedRef.current;
        joinedRef.current = null;
        socketManager
          .emitWithAck(socket, "inbox.leave_lead", { lead_id: leaving })
          .catch(() => {
            // Salir es best-effort: si el socket ya murió, el room murió con él.
          });
      }
    };
  }, [socket, leadId, load]);

  // El avance mueve la tarjeta en el sitio, sin volver a pedir el lead: son
  // varios mensajes por pasada y no tiene sentido recargar con cada uno.
  useSocketEvent(socket, "prospecting.lead_enrichment_progress", (payload) => {
    if (payload.lead_id !== leadId) return;
    setRun(payload.run as EnrichmentRunDTO);
  });

  /**
   * Al terminar SÍ se recarga: los datos nuevos están en el lead, no en el
   * evento. Y se dice qué pasó, que son dos finales distintos — «no
   * encontramos nada» es un desenlace legítimo y callárselo es lo que hacía
   * que pareciera un fallo.
   */
  useSocketEvent(socket, "prospecting.lead_enrichment_completed", (payload) => {
    if (payload.lead_id !== leadId) return;
    setRun(payload.run as EnrichmentRunDTO);
    void load();
    // P2: una pasada de personas se anuncia como tal, y relee la sección.
    const steps = (payload.run as EnrichmentRunDTO).steps;
    if (steps.some((step) => step.capability === "find_people")) {
      setPeopleRefresh((current) => current + 1);
      const news = steps.map((step) => step.detail).filter((detail) => detail !== undefined && detail !== null);
      showAlert({
        tone: "info",
        title: "Terminamos de buscar personas",
        description: news.length > 0 ? news.join(" ") : "Abajo tienes a quién encontramos y de dónde salió.",
      });
      return;
    }
    if (steps.some((step) => step.capability === "reveal_phone" || step.capability === "enrich_person")) {
      setWaitingPhone(false);
      return;
    }
    const ganados = payload.run.fields_filled;
    showAlert(
      ganados > 0
        ? {
            tone: "success",
            title:
              ganados === 1 ? "Encontramos un dato nuevo" : `Encontramos ${String(ganados)} datos nuevos`,
            description: "Abajo tienes lo que hallamos y de qué fuente salió cada cosa.",
          }
        : {
            tone: "info",
            title: "No encontramos nada nuevo",
            description:
              "Ya preguntamos a todas las fuentes disponibles para este lead. Puedes completarlo a mano.",
          },
    );
  });

  /**
   * Respaldo del WebSocket, no el mecanismo.
   *
   * Corre SOLO mientras hay una pasada viva y es lo que sostiene la promesa de
   * que la verdad vive en la fila: si el socket no llegó —pestaña dormida,
   * token rotando, red mala— la tarjeta se mueve igual.
   */
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [working, load]);

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
   * esperar en la petición: el avance llega por la sala de este lead y, de
   * respaldo, releyendo la fila. No se toca `lead.status` — ese es el ciclo de
   * vida del lead y el servidor nunca escribe `enriching`; lo transitorio es
   * nuestra petición, no la vida del lead.
   *
   * Se pinta la pasada como encolada en el acto: el 202 ya confirmó que el
   * trabajo existe, y esperar al primer evento dejaría la tarjeta en blanco
   * justo en el segundo en que el usuario mira.
   */
  const onEnrich = useCallback(async () => {
    setBusy(true);
    try {
      await enrichLead(leadId);
      setRun({
        id: "pendiente",
        lead_id: leadId,
        status: "queued",
        steps: [],
        fields_filled: 0,
        units_spent: 0,
        manual: true,
        started_at: null,
        finished_at: null,
        created_at: new Date().toISOString(),
      });
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
  }, [leadId, showAlert]);

  /**
   * Volver a puntuar este lead. SÍ puede gastar cuota —por eso pide
   * `leads:manage`— y se dice en el botón: quien lo pulsa está pidiendo que se
   * pague por saber.
   */
  /** P2 · «Buscar personas»: la misma cola y el mismo visor que «Buscar datos». */
  const onFindPeople = useCallback(async () => {
    setBusy(true);
    try {
      await findPeopleForLead(leadId);
      setRun({
        id: "pendiente",
        lead_id: leadId,
        status: "queued",
        steps: [],
        fields_filled: 0,
        units_spent: 0,
        manual: true,
        started_at: null,
        finished_at: null,
        created_at: new Date().toISOString(),
      });
      showAlert({
        tone: "info",
        title: "Buscando personas",
        description: "Miramos el registro mercantil, su web y Apollo. Buscar no gasta créditos.",
      });
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo buscar personas",
        description: errorMessage(caught, "Intenta de nuevo."),
      });
    } finally {
      setBusy(false);
    }
  }, [leadId, showAlert]);

  /** P2 · revelar a ESTA persona (su ficha). */
  const onReveal = useCallback(
    async (fields: ("email" | "phone")[]) => {
      setBusy(true);
      try {
        await revealLeads([leadId], fields);
        if (fields.includes("phone")) setWaitingPhone(true);
        showAlert({ tone: "info", title: fields.includes("phone") ? "Pedimos su contacto" : "Pedimos su correo" });
      } catch (caught) {
        showAlert({ tone: "error", title: "No se pudo revelar", description: errorMessage(caught) });
      } finally {
        setBusy(false);
      }
    },
    [leadId, showAlert],
  );

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

  const canManage = hasPermission("leads:manage");

  if (lead === null) {
    if (loadError === null) return <BrandLoader label="Cargando lead" />;
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <BackToInbox />
        <div className="border-border bg-card flex flex-col items-start gap-3 rounded-3xl border p-6">
          <p className="font-heading text-xl font-bold tracking-tight">No pudimos abrir el lead</p>
          <p className="text-muted-foreground text-sm text-pretty">{loadError}</p>
          <Button variant="outline" className="rounded-full" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <BackToInbox />

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance break-words sm:text-[2.5rem]">
            {leadDisplayName(lead)}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} map={LEAD_STATUS_MAP} appearance="dot" />
            <StatusBadge status={lead.quality_status} map={QUALITY_STATUS_MAP} appearance="dot" />
            <span className="border-border text-muted-foreground inline-flex h-6 items-center rounded-full border px-2.5 text-xs">
              {LEGAL_BASIS_LABELS[lead.legal_basis]}
            </span>
            <span className="text-muted-foreground ml-1 text-xs">Puedo contactar por</span>
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
          {lead.kind === "person" && lead.parent !== null && (
            <p className="text-sm text-pretty">
              {lead.title !== null && <>{lead.title} · </>}
              {lead.buying_role !== null && (
                <span className="font-semibold">{BUYING_ROLE_LABELS[lead.buying_role]}</span>
              )}
              {lead.decision_maker_confidence !== null && (
                <span className="text-muted-foreground tabular-nums"> · confianza {lead.decision_maker_confidence}</span>
              )}{" "}
              en{" "}
              <Link href={`/marketing/leads/${lead.parent.id}`} className="inline-flex min-h-6 items-center font-medium underline underline-offset-4">
                {lead.parent.display_name ?? "su negocio"}
              </Link>
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {SOURCE_LABELS[lead.source]} · descubierto el {formatShortDate(lead.created_at)}
          </p>
        </div>

        {/* Envuelven: a 390 px las tres no caben en una fila. Buscar datos va en primario: para un lead a medio
            llenar es la acción que desbloquea a las otras dos. */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {canDiscard(lead) && (
              <Button variant="ghost" className="rounded-full" disabled={busy} onClick={() => void onDiscard()}>
                <X className="size-4" aria-hidden />
                Descartar
              </Button>
            )}
            <Button variant="outline" className="rounded-full" disabled={busy || working} onClick={() => void onVerify()}>
              <RefreshCw className="size-4" aria-hidden />
              Volver a revisar
            </Button>
            {/* Una PERSONA se revela; un negocio busca datos y busca personas. En un negocio,
                «Buscar personas» es el primario (tablero 5b): es lo que lleva a quien decide. */}
            {lead.kind === "person" ? (
              <RevealButtons
                target={{
                  id: lead.id,
                  masked: lead.masked,
                  revealable: lead.source === "apollo_people",
                  email: lead.email,
                  phone: lead.phone,
                  has_email: hasAttribute(lead.attributes, "has_email") || lead.email !== null,
                  has_phone: hasAttribute(lead.attributes, "has_direct_phone") || lead.phone !== null,
                  in_crm: lead.contact_id !== null,
                }}
                costs={costs}
                busy={busy}
                waitingPhone={waitingPhone}
                onReveal={(fields) => void onReveal(fields)}
              />
            ) : (
              <>
                <Button variant="outline" className="rounded-full" disabled={busy || working} onClick={() => void onEnrich()}>
                  <WandSparkles aria-hidden className="size-4" />
                  Buscar datos
                </Button>
                <Button className="rounded-full" disabled={busy || working} onClick={() => void onFindPeople()}>
                  {working ? (
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <UsersRound aria-hidden className="size-4" />
                  )}
                  {working ? "Buscando…" : "Buscar personas"}
                </Button>
              </>
            )}
          </div>
        )}
      </header>

      {loadError !== null && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span aria-hidden className="bg-warning size-2 shrink-0 rounded-full" />
          <span className="text-muted-foreground">No pudimos refrescar la ficha: {loadError}</span>
          <button type="button" className="inline-flex min-h-6 items-center font-medium underline underline-offset-4" onClick={() => void load()}>
            Reintentar
          </button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-start [&>*]:min-w-0">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Los datos primero: es lo que se viene a ver. Debajo, de dónde salió cada uno y su historia. */}
          <LeadIdentityCard lead={lead} signals={signals} />
          {lead.kind === "business" && (
            <LeadPeopleSection
              leadId={lead.id}
              refreshKey={peopleRefresh}
              searching={working && (run?.steps ?? []).some((step) => step.capability === "find_people")}
              costs={costs}
              canManage={canManage}
              canPromote={hasPermission("leads:promote")}
              onSearch={() => void onFindPeople()}
              onPeopleChange={setPeople}
            />
          )}
          <LeadProvenance lead={lead} />
          <LeadTimeline events={lead.events} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* La única isla: promover o, si ya se promovió, qué sigue. */}
          {canPromote(lead) && hasPermission("leads:promote") && (
            <PromotionGate
              lead={lead}
              busy={busy}
              onPromote={() => void onPromote()}
              people={people
                .filter(
                  (person) =>
                    !person.in_crm &&
                    PROMOTED_WITH_BUSINESS.includes(person.buying_role) &&
                    (person.email !== null || person.phone !== null),
                )
                .map((person) => ({ name: person.display_name ?? "Sin nombre", role: person.buying_role }))}
            />
          )}
          {lead.status === "promoted" && lead.contact_id !== null && (
            <InkIsland label="Ya es un contacto de tu CRM" glow="ai" className="gap-3">
              <Kicker>En el CRM</Kicker>
              <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight">Ya es un contacto de tu CRM</h2>
              {/* F4a: promover declara la base legal y crea el contacto; escribirle es otra decisión, y es del
                  operador. Por eso el seguimiento se OFRECE aquí y no se dispara solo. */}
              <p className="text-muted-foreground text-sm">Todavía no le hemos escrito.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <BulkFollowUpButton
                  audience={{ source: "contacts", contact_ids: [lead.contact_id] }}
                  audienceLabel={`${lead.display_name ?? "El lead"} · recién promovido desde captación`}
                  label="Poner al agente a trabajar"
                  variant="contrast"
                  size="default"
                />
                <Button variant="glass" asChild>
                  <Link href={`/crm/contacts/${lead.contact_id}`}>Ver en el CRM</Link>
                </Button>
              </div>
            </InkIsland>
          )}
          <QualityBreakdown score={lead.quality_score} signals={lead.quality_signals} />
          {/* Qué se consultó y qué dio cada fuente. */}
          <EnrichmentRunCard run={run} />
        </div>
      </div>
    </div>
  );
}

function BackToInbox() {
  return (
    <Link
      href="/marketing/leads"
      className="text-muted-foreground hover:text-foreground inline-flex min-h-6 w-fit items-center gap-1.5 text-sm underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Volver a la bandeja
    </Link>
  );
}

/** ¿Apollo dice que tiene este dato? (viaja en `attributes`, sin revelar). */
function hasAttribute(attributes: unknown, key: string): boolean {
  return typeof attributes === "object" && attributes !== null && (attributes as Record<string, unknown>)[key] === true;
}
