"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Plus, Search, Ticket } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  PROMOTION_KIND_LABELS,
  PROMOTION_KIND_ORDER,
  type PromotionKind,
} from "@/modules/marketing/domain/enums";
import {
  matchesPromotionStateFilter,
  promotionState,
  PROMOTION_STATE_FILTER_LABELS,
  type PromotionDTO,
  type PromotionStateFilter,
} from "@/modules/marketing/domain/promotion";
import {
  deletePromotion,
  listPromotions,
  updatePromotion,
} from "@/modules/marketing/infrastructure/services/promotions-service.adapter";
import { PromotionCard } from "./components/PromotionCard";
import { RedemptionsSheet } from "./components/RedemptionsSheet";
import { PromotionForm, PROMOTION_FORM_ID } from "./forms/PromotionForm";

const ALL = "__all__";

/**
 * Catálogo de promociones.
 *
 * El endpoint NO pagina ni busca (devuelve la colección completa), así que el
 * filtrado, la búsqueda y el orden van en cliente: montar `usePaginatedList`
 * aquí sería pedirle páginas a algo que no las tiene.
 */
export function PromotionsView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();

  const [promotions, setPromotions] = useState<PromotionDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [stateFilter, setStateFilter] = useState<PromotionStateFilter>("active");
  const [kindFilter, setKindFilter] = useState<PromotionKind | typeof ALL>(ALL);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<{ promotion: PromotionDTO | null } | null>(null);
  const [redemptionsOf, setRedemptionsOf] = useState<PromotionDTO | null>(null);
  /** Instante contra el que se evalúa el estado derivado. Se fija al cargar
   *  para que todas las promociones se comparen contra el MISMO momento. */
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPromotions(await listPromotions());
      setNow(new Date());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No pudimos cargar tus promociones"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);


  const visible = useMemo(() => {
    if (!promotions) return [];
    const term = search.trim().toLowerCase();
    return promotions
      .filter((p) => matchesPromotionStateFilter(promotionState(p, now), stateFilter))
      .filter((p) => kindFilter === ALL || p.kind === kindFilter)
      .filter(
        (p) =>
          term === "" ||
          p.name.toLowerCase().includes(term) ||
          (p.shared_code?.toLowerCase().includes(term) ?? false),
      )
      .sort((a, b) => {
        // Lo que está dando algo ahora, primero; dentro de cada grupo, lo más nuevo.
        const liveA = promotionState(a, now) === "live" ? 0 : 1;
        const liveB = promotionState(b, now) === "live" ? 0 : 1;
        if (liveA !== liveB) return liveA - liveB;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [promotions, stateFilter, kindFilter, search, now]);

  const hasFilters = stateFilter !== "all" || kindFilter !== ALL || search.trim() !== "";
  const isEmpty = promotions !== null && promotions.length === 0;

  function openEditor(promotion: PromotionDTO | null) {
    setEditing({ promotion });
  }

  function handleToggle(promotion: PromotionDTO) {
    const turningOn = !promotion.enabled;
    showModal({
      title: turningOn ? `¿Encender «${promotion.name}»?` : `¿Apagar «${promotion.name}»?`,
      description: turningOn
        ? "El agente podrá emitir y aplicar sus cupones a partir de ahora."
        : "Deja de emitir cupones nuevos. Los ya emitidos siguen siendo válidos hasta que venzan.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: turningOn ? "Encender" : "Apagar",
          variant: "default",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                const saved = await updatePromotion(promotion.id, { enabled: turningOn });
                setPromotions((prev) =>
                  prev ? prev.map((p) => (p.id === saved.id ? saved : p)) : prev,
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

  function handleDelete(promotion: PromotionDTO) {
    showModal({
      title: `¿Eliminar «${promotion.name}»?`,
      description:
        "Los canjes ya registrados se conservan para tu contabilidad, pero la promoción desaparece y ninguna regla podrá volver a usarla.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: "Eliminar",
          variant: "destructive",
          onClick: () => {
            closeModal();
            void (async () => {
              try {
                await deletePromotion(promotion.id);
                setPromotions((prev) => (prev ? prev.filter((p) => p.id !== promotion.id) : prev));
                showAlert({ tone: "success", title: "Promoción eliminada", open: true });
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
        title="Promociones"
        description="Descuentos, regalos y envío gratis que el agente aplica solo a los pedidos."
        actions={
          canManage && (
            <Button className="rounded-full" onClick={() => openEditor(null)}>
              <Plus className="size-4" aria-hidden="true" />
              Nueva promoción
            </Button>
          )
        }
      />

      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={stateFilter}
            onValueChange={(v: string) => setStateFilter(v as PromotionStateFilter)}
          >
            <SelectTrigger className="h-9 w-auto min-w-36" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROMOTION_STATE_FILTER_LABELS) as PromotionStateFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PROMOTION_STATE_FILTER_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={kindFilter}
            onValueChange={(v: string) => setKindFilter(v as PromotionKind | typeof ALL)}
          >
            <SelectTrigger className="h-9 w-auto min-w-40" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {PROMOTION_KIND_ORDER.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {PROMOTION_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative min-w-44 flex-1 sm:max-w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <label className="sr-only" htmlFor="promo-search">
              Buscar promoción
            </label>
            <Input
              id="promo-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="h-9 pl-8"
            />
          </div>

          <span className="text-xs tabular-nums text-muted-foreground">
            {visible.length} de {promotions?.length ?? 0}
          </span>
        </div>
      )}

      {loading && promotions === null ? (
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
          icon={Ticket}
          accent="amber"
          title="Aún no tienes promociones"
          description="Una promoción es lo que el agente puede ofrecer para cerrar una venta: un descuento, un regalo o el envío gratis. Los cupones que emite vencen de verdad."
          action={
            canManage && (
              <Button className="rounded-full" onClick={() => openEditor(null)}>
                Crear mi primera promoción
              </Button>
            )
          }
        />
      ) : visible.length === 0 ? (
        // Vacío POR FILTROS ≠ vacío real: el mensaje y la acción son distintos.
        <EmptyState
          icon={Search}
          accent="muted"
          variant="solid"
          title={hasFilters ? "Ninguna promoción coincide" : "Nada que mostrar"}
          description={
            hasFilters
              ? "Prueba con otro estado o tipo, o limpia la búsqueda."
              : "Vuelve a cargar la lista para verlas."
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStateFilter("all");
                  setKindFilter(ALL);
                  setSearch("");
                }}
              >
                Limpiar filtros
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void load()}>
                Recargar
              </Button>
            )
          }
        />
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-background">
          {visible.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              now={now}
              canManage={canManage}
              onEdit={() => openEditor(promotion)}
              onRedemptions={() => setRedemptionsOf(promotion)}
              onToggle={() => handleToggle(promotion)}
              onDelete={() => handleDelete(promotion)}
            />
          ))}
        </div>
      )}

      <p className="flex gap-2.5 rounded-xl border border-accent-amber/30 bg-accent-amber/[0.07] px-4 py-3 text-sm text-muted-foreground">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-amber" />
        <span>
          <strong className="font-medium text-foreground">Los cupones vencen de verdad.</strong>{" "}
          Cuando pones una vigencia, el sistema rechaza el cupón pasada la hora — no es un adorno
          del mensaje, es lo que hace que la gente compre hoy.
        </span>
      </p>

      <DetailSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        size="lg"
        title={editing?.promotion ? "Editar promoción" : "Nueva promoción"}
        subtitle="El descuento lo calcula el sistema y lo aplica al pedido; nunca el agente."
        renderFooter={() => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                (
                  document.getElementById(PROMOTION_FORM_ID) as HTMLFormElement | null
                )?.requestSubmit()
              }
            >
              {editing?.promotion ? "Guardar cambios" : "Crear promoción"}
            </Button>
          </div>
        )}
      >
        {editing !== null && (
          <PromotionForm
            // Remonta el formulario al cambiar de promoción: sin `key`, RHF
            // conserva los valores del anterior.
            key={editing.promotion?.id ?? "new"}
            promotion={editing.promotion}
            onSaved={(saved) => {
              setPromotions((prev) => {
                if (!prev) return [saved];
                return prev.some((p) => p.id === saved.id)
                  ? prev.map((p) => (p.id === saved.id ? saved : p))
                  : [saved, ...prev];
              });
              setEditing(null);
            }}
          />
        )}
      </DetailSheet>

      <RedemptionsSheet
        promotion={redemptionsOf}
        open={redemptionsOf !== null}
        onOpenChange={(open) => !open && setRedemptionsOf(null)}
      />
    </div>
  );
}
