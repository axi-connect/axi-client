"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, ShieldCheck, ShoppingCart, Target, Zap } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { PageHeader } from "@/shared/components/layout/page-header";
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
import { AutomationCard, describeDelay } from "./components/AutomationCard";
import { AutomationForm, AUTOMATION_FORM_ID } from "./forms/AutomationForm";

const TRIGGER_ICONS: Record<TriggerType, typeof ShoppingCart> = {
  cart_abandoned: ShoppingCart,
  conversation_inactive: MessageSquare,
  deal_stalled: Target,
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

  // Solo las promociones VIVAS pueden asignarse: ofrecer una vencida crearía
  // una regla que se salta sola con `promotion_inactive`.
  useEffect(() => {
    const now = new Date();
    listPromotions()
      .then((rows) => setPromotions(rows.filter((p) => isPromotionLive(p, now))))
      .catch(() => setPromotions([]));
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
        open: true,
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
                  open: true,
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
                showAlert({ tone: "success", title: "Regla eliminada", open: true });
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo eliminar"),
                  open: true,
                });
              }
            })();
          },
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recuperación de ventas"
        description="Reglas que reenganchan solas a quien se quedó a medias."
        actions={
          canManage &&
          !isEmpty && (
            <Button
              className="rounded-full"
              onClick={() => setEditing({ automation: null, trigger: "cart_abandoned" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Nueva regla
            </Button>
          )
        }
      />

      {!isEmpty && automations !== null && (
        <p className="flex gap-2.5 rounded-xl border border-info/25 bg-info/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
          <span>
            <strong className="font-medium text-foreground">
              Un cliente recibe como máximo un mensaje por episodio
            </strong>
            , uno al día y uno cada 24 horas. Cuando varias reglas del mismo disparador coinciden,
            gana la de menor prioridad.
          </span>
        </p>
      )}

      {loading && automations === null ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Zap}
          accent="amber"
          title="Aún no recuperas ventas"
          description="Cada día se te escapan carritos a medias y conversaciones que se apagaron. Una regla los reengancha sola, a la hora que tú decidas y con el descuento que tú elijas."
          action={
            canManage && (
              <Button
                className="rounded-full"
                onClick={() => setEditing({ automation: null, trigger: "cart_abandoned" })}
              >
                Crear mi primera regla
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {TRIGGER_ORDER.map((trigger) => {
            const rules = grouped.get(trigger) ?? [];
            const Icon = TRIGGER_ICONS[trigger];
            return (
              <section key={trigger}>
                <div className="mb-2.5 flex items-center gap-2">
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{TRIGGER_LABELS[trigger]}</h2>
                  <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">
                    {rules.length === 0
                      ? "sin reglas"
                      : `${rules.length} ${rules.length === 1 ? "regla" : "reglas"}`}
                  </span>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditing({ automation: null, trigger })}
                    >
                      Añadir
                    </Button>
                  )}
                </div>

                {rules.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-4 text-xs text-muted-foreground">
                    Nadie está recuperando estas ventas todavía.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
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
      )}

      {automations !== null && automations.length > 0 && enabledCount === 0 && (
        <p className="rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">
            Ninguna de tus reglas está encendida.
          </strong>{" "}
          Nacen apagadas a propósito: revisa el mensaje y enciéndelas cuando estés conforme.
        </p>
      )}

      <DetailSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
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
            }}
          />
        )}
      </DetailSheet>
    </div>
  );
}
