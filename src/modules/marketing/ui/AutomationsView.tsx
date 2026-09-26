"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, ShoppingCart, Target } from "lucide-react";
import { formatMillions } from "@/core/lib/format";
import { BentoFigure, BentoLink, BentoTile } from "@/shared/components/features/bento";
import { LoadError } from "@/modules/marketing/ui/components/premium";
import { useDeepLinkTarget } from "@/core/hooks/use-deep-link-target";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";
import { Button } from "@/shared/components/ui/button";
import type {
  AutomationDTO,
  AutomationMetricsDTO,
} from "@/modules/marketing/domain/automation";
import { canEnableAutomation } from "@/modules/marketing/domain/automation";
import {
  TRIGGER_LABELS,
  TRIGGER_ORDER,
  type TriggerType,
} from "@/modules/marketing/domain/enums";
import { isPromotionLive, type PromotionDTO } from "@/modules/marketing/domain/promotion";
import {
  deleteAutomation,
  getAutomationMetrics,
  listAutomations,
  updateAutomation,
} from "@/modules/marketing/infrastructure/services/automations-service.adapter";
import { listPromotions } from "@/modules/marketing/infrastructure/services/promotions-service.adapter";
import { getMarketingSettings } from "@/modules/marketing/infrastructure/services/settings-service.adapter";
import { AutomationCard, describeDelay } from "./components/AutomationCard";
import { AutomationForm, AUTOMATION_FORM_ID } from "./forms/AutomationForm";

const TRIGGER_ICONS: Record<TriggerType, typeof ShoppingCart> = {
  cart_abandoned: ShoppingCart,
  conversation_inactive: MessageSquare,
  deal_stalled: Target,
};

/** Qué pasó para que el disparador salte, en palabras del dueño. */
const TRIGGER_HINTS: Record<TriggerType, string> = {
  cart_abandoned: "Alguien armó un pedido y no lo terminó",
  conversation_inactive: "Preguntó, le respondimos y no volvió",
  deal_stalled: "Un trato del CRM lleva días sin moverse",
};

/**
 * Reglas de recuperación de ventas.
 *
 * Se agrupan por disparador y se ordenan por prioridad porque así es como el
 * backend las evalúa (first-match-wins dentro del mismo disparador): una lista
 * plana ordenada por fecha escondería la única relación que importa entre ellas.
 */
export function AutomationsView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();

  const [automations, setAutomations] = useState<AutomationDTO[] | null>(null);
  const [metrics, setMetrics] = useState<Record<string, AutomationMetricsDTO>>({});
  const [promotions, setPromotions] = useState<PromotionDTO[]>([]);
  /** Los límites reales del tenant: «Cuidamos a tus clientes» no puede prometer lo que Ajustes no hace. */
  const [guard, setGuard] = useState<Awaited<ReturnType<typeof getMarketingSettings>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    automation: AutomationDTO | null;
    trigger: TriggerType;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAutomations();
      setAutomations(rows);
      setError(null);

      // Las métricas cuestan una petición por regla. Se piden todas porque un
      // tenant tiene un puñado de reglas, pero cada fallo se aísla: una regla
      // sin cifras no puede dejar la lista entera sin ellas.
      const results = await Promise.all(
        rows.map(async (a) => {
          try {
            return [a.id, await getAutomationMetrics(a.id)] as const;
          } catch {
            return null;
          }
        }),
      );
      setMetrics(Object.fromEntries(results.filter((r) => r !== null)));
    } catch (err) {
      setError(errorMessage(err, "No pudimos cargar tus reglas"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Llegar desde el chat de Axel: `?automation=<id>` abre esa regla. El
     disparador sale de la propia regla, no del grupo desde el que se hizo clic:
     por enlace no hay grupo del que sacarlo. */
  const deepLink = useDeepLinkTarget("automation", automations, {
    onFound: (automation) => {
      setEditing({ automation, trigger: automation.trigger_type });
    },
    onMissing: () => {
      showAlert({
        tone: "warning",
        title: "Esa regla ya no está",
        description: "Se eliminó o alguien de tu equipo la cambió.",
      });
    },
  });

  // Solo las promociones VIVAS pueden asignarse: ofrecer una vencida crearía
  // una regla que se salta sola con `promotion_inactive`.
  useEffect(() => {
    const now = new Date();
    listPromotions()
      .then((rows) => setPromotions(rows.filter((p) => isPromotionLive(p, now))))
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    getMarketingSettings()
      .then(setGuard)
      .catch(() => setGuard(null));
  }, []);

  const grouped = useMemo(() => {
    const byTrigger = new Map<TriggerType, AutomationDTO[]>();
    for (const trigger of TRIGGER_ORDER) byTrigger.set(trigger, []);
    for (const automation of automations ?? []) {
      byTrigger.get(automation.trigger_type)?.push(automation);
    }
    for (const list of byTrigger.values()) {
      // Prioridad ascendente = orden de evaluación. Desempate estable por nombre.
      list.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    }
    return byTrigger;
  }, [automations]);

  const enabledCount = automations?.filter((a) => a.enabled).length ?? 0;
  const isEmpty = automations !== null && automations.length === 0;

  function handleToggle(automation: AutomationDTO) {
    const turningOn = !automation.enabled;

    if (turningOn && !canEnableAutomation(automation)) {
      showAlert({
        tone: "error",
        title: "Elige primero una plantilla de Meta aprobada",
      });
      return;
    }

    showModal({
      title: turningOn ? `¿Encender «${automation.name}»?` : `¿Apagar «${automation.name}»?`,
      description: turningOn
        ? `A partir de ahora, cada ${TRIGGER_LABELS[automation.trigger_type].toLowerCase()} que cumpla las condiciones recibirá un mensaje a los ${describeDelay(automation.delay_minutes)}. Son clientes reales y les llegará al WhatsApp. Puedes apagarla cuando quieras.`
        : "Deja de dispararse. Los mensajes ya enviados no se pueden recuperar, pero no saldrá ninguno más.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: turningOn ? "Encender regla" : "Apagar regla",
          variant: "default",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                const saved = await updateAutomation(automation.id, { enabled: turningOn });
                setAutomations((prev) =>
                  prev ? prev.map((a) => (a.id === saved.id ? saved : a)) : prev,
                );
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo cambiar el estado"),
                });
              }
            })();
          },
        },
      ],
    });
  }

  function handleDelete(automation: AutomationDTO) {
    showModal({
      title: `¿Eliminar «${automation.name}»?`,
      description:
        "Sus métricas históricas dejan de estar disponibles. Si solo quieres que deje de dispararse, apágala en vez de eliminarla.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: "Eliminar",
          variant: "destructive",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                await deleteAutomation(automation.id);
                setAutomations((prev) =>
                  prev ? prev.filter((a) => a.id !== automation.id) : prev,
                );
                showAlert({ tone: "success", title: "Regla eliminada" });
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo eliminar"),
                });
              }
            })();
          },
        },
      ],
    });
  }

  const totals = Object.values(metrics).reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.attributed_revenue_cents,
      converted: acc.converted + m.converted,
      issued: acc.issued + m.coupons_issued,
      redeemed: acc.redeemed + m.coupons_redeemed,
      skipped: acc.skipped + m.skipped,
    }),
    { revenue: 0, converted: 0, issued: 0, redeemed: 0, skipped: 0 },
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MarketingHeader
        title="Recuperación de ventas"
        description="Mensajes que salen solos cuando una venta se enfría. Nacen apagados: tú decides cuándo encenderlos."
        actions={
          canManage &&
          !isEmpty && (
            <Button className="rounded-full" onClick={() => setEditing({ automation: null, trigger: "cart_abandoned" })}>
              <Plus className="size-4" aria-hidden="true" />
              Nueva regla
            </Button>
          )
        }
      />

      {loading && automations === null ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <LoadError message={error} onRetry={() => void load()} />
      ) : isEmpty ? (
        <EmptyState
          glyph="ai"
          title="Aún no recuperas ventas"
          description="Cada día se te escapan carritos a medias y conversaciones que se apagaron. Una regla los reengancha sola, a la hora que tú decidas y con el descuento que tú elijas."
          action={
            canManage && (
              <Button className="rounded-full" onClick={() => setEditing({ automation: null, trigger: "cart_abandoned" })}>
                Crear mi primera regla
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start [&>*]:min-w-0">
          <div className="flex min-w-0 flex-col gap-4">
            {automations !== null && automations.length > 0 && enabledCount === 0 ? (
              <p className="flex gap-2.5 text-sm text-pretty">
                <span aria-hidden="true" className="bg-warning mt-[0.45em] size-2 shrink-0 rounded-full" />
                <span>
                  <b className="font-semibold">Ninguna de tus reglas está encendida.</b>{" "}
                  <span className="text-muted-foreground">
                    Nacen apagadas a propósito: revisa el mensaje y enciéndelas cuando estés conforme.
                  </span>
                </span>
              </p>
            ) : null}
            {TRIGGER_ORDER.map((trigger) => {
              const rules = grouped.get(trigger) ?? [];
              const Icon = TRIGGER_ICONS[trigger];
              return (
                <section
                  key={trigger}
                  aria-labelledby={`trigger-${trigger}`}
                  className="border-border bg-card @container min-w-0 rounded-3xl border px-5 pt-5 pb-1 sm:px-6"
                >
                  <header className="border-border flex flex-wrap items-center gap-x-4 gap-y-3 border-b pb-4">
                    <span aria-hidden="true" className="bg-muted grid size-10 shrink-0 place-items-center rounded-xl">
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 id={`trigger-${trigger}`} className="font-heading text-lg leading-tight font-bold tracking-tight">
                        {TRIGGER_LABELS[trigger]}
                      </h2>
                      <p className="text-muted-foreground text-sm text-pretty">{TRIGGER_HINTS[trigger]}</p>
                    </div>
                    {canManage && (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing({ automation: null, trigger })}>
                        Añadir regla
                      </Button>
                    )}
                  </header>
                  {rules.length === 0 ? (
                    <p className="text-muted-foreground py-5 text-sm">Nadie está recuperando estas ventas todavía.</p>
                  ) : (
                    <div className="divide-border divide-y">
                      {rules.map((automation, index) => (
                        <AutomationCard
                          key={automation.id}
                          automation={automation}
                          metrics={metrics[automation.id] ?? null}
                          rank={index + 1}
                          canManage={canManage}
                          onEdit={() => setEditing({ automation, trigger })}
                          onToggle={() => handleToggle(automation)}
                          onDelete={() => handleDelete(automation)}
                          onConfigureHsm={() => setEditing({ automation, trigger })}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <aside className="grid gap-4 md:grid-cols-2 xl:grid-cols-1" aria-label="Resumen de la recuperación">
            <BentoTile label="Lo recuperado por tus reglas">
              <BentoFigure value={formatMillions(totals.revenue)} />
              <p className="text-muted-foreground text-sm">
                {totals.converted.toLocaleString("es-CO")} {totals.converted === 1 ? "pedido pagado" : "pedidos pagados"}
              </p>
              <dl className="border-border divide-border mt-1 divide-y border-t text-sm">
                {(
                  [
                    ["Cupones entregados", totals.issued],
                    ["Cupones canjeados", totals.redeemed],
                    ["No se enviaron", totals.skipped],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt>{label}</dt>
                    <dd className="font-semibold tabular-nums">{value.toLocaleString("es-CO")}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground text-xs text-pretty">
                Pedidos pagados dentro de la ventana de atribución de cada regla, después de su mensaje.
              </p>
            </BentoTile>
            <BentoTile label="Cuidamos a tus clientes" aside={<BentoLink href="/marketing/settings">Ajustes</BentoLink>}>
              <ul className="divide-border divide-y text-sm">
                {[
                  <>Nadie recibe más de <b className="font-semibold">un mensaje por episodio</b></>,
                  guard ? (
                    <>
                      Como mucho <b className="font-semibold">{guard.daily_cap_per_contact} al día</b> por persona y uno cada{" "}
                      <b className="font-semibold">{guard.cooldown_hours} h</b>
                    </>
                  ) : null,
                  guard?.exclude_human_active ? (
                    <>Si alguien de tu equipo está atendiendo, <b className="font-semibold">las reglas esperan</b></>
                  ) : null,
                  <>Quien pidió no recibir <b className="font-semibold">no recibe</b></>,
                  <>Si varias reglas coinciden, <b className="font-semibold">gana la de menor número</b></>,
                ]
                  .filter((line) => line !== null)
                  .map((line, index) => (
                  <li key={index} className="flex gap-2.5 py-2.5 text-pretty first:pt-0 last:pb-0">
                    <span aria-hidden="true" className="bg-foreground mt-[0.5em] size-1.5 shrink-0 rounded-full" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </BentoTile>
          </aside>
        </div>
      )}

      <DetailSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (open) return;
          setEditing(null);
          deepLink.clear();
        }}
        size="xl"
        title={editing?.automation ? "Editar regla" : "Nueva regla"}
        subtitle="Las reglas nacen apagadas: encenderla es un paso aparte."
        renderFooter={() => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                (
                  document.getElementById(AUTOMATION_FORM_ID) as HTMLFormElement | null
                )?.requestSubmit()
              }
            >
              {editing?.automation ? "Guardar cambios" : "Crear regla apagada"}
            </Button>
          </div>
        )}
      >
        {editing !== null && (
          <AutomationForm
            key={editing.automation?.id ?? `new-${editing.trigger}`}
            automation={editing.automation}
            trigger={editing.trigger}
            promotions={promotions}
            onSaved={(saved) => {
              setAutomations((prev) => {
                if (!prev) return [saved];
                return prev.some((a) => a.id === saved.id)
                  ? prev.map((a) => (a.id === saved.id ? saved : a))
                  : [...prev, saved];
              });
              setEditing(null);
              deepLink.clear();
            }}
          />
        )}
      </DetailSheet>
    </div>
  );
}
