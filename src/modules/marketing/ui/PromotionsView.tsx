"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeepLinkTarget } from "@/core/hooks/use-deep-link-target";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { LoadError } from "@/modules/marketing/ui/components/premium";
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
  isGovernedPromotion,
  matchesPromotionOriginFilter,
  matchesPromotionStateFilter,
  promotionCodes,
  promotionState,
  PROMOTION_ORIGIN_FILTER_LABELS,
  PROMOTION_STATE_FILTER_LABELS,
  type PromotionDTO,
  type PromotionOriginFilter,
  type PromotionStateFilter,
} from "@/modules/marketing/domain/promotion";
import {
  deletePromotion,
  listPromotions,
  updatePromotion,
} from "@/modules/marketing/infrastructure/services/promotions-service.adapter";
import { listIntegrations } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
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
  /** Gobierno de pedidos declarado por la plataforma (null = no se pudo leer). */
  const [ordersGoverned, setOrdersGoverned] = useState<boolean | null>(null);

  const [stateFilter, setStateFilter] = useState<PromotionStateFilter>("active");
  const [kindFilter, setKindFilter] = useState<PromotionKind | typeof ALL>(ALL);
  const [originFilter, setOriginFilter] = useState<PromotionOriginFilter>("all");
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

  /* La señal de verdad de «la tienda cobra los pedidos» es el gobierno que
     declara la plataforma, no que haya promos espejadas (una tienda gobernada
     puede no tener ningún descuento activo). Best-effort: sin permiso de
     integraciones se cae a la inferencia por espejo. */
  useEffect(() => {
    listIntegrations()
      .then((res) => setOrdersGoverned(res.governance.orders === "provider_active"))
      .catch(() => setOrdersGoverned(null));
  }, []);

  /* Llegar desde el chat de Axel: `?promotion=<id>` abre ese borrador. Se pone
     el filtro en «todas» a propósito — lo que Axel deja nace APAGADO, y con el
     filtro por defecto («activas») el dueño cerraría el panel y no vería la fila
     de la promoción que acaba de revisar. */
  /* `?new=1` (desde el Resumen): abre el editor vacío una vez y limpia el parámetro,
     para que recargar no lo vuelva a abrir. */
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const wantsNew = params.get("new") === "1";
  useEffect(() => {
    if (!wantsNew || !canManage) return;
    setEditing({ promotion: null });
    router.replace(pathname, { scroll: false });
  }, [wantsNew, canManage, router, pathname]);

  const deepLink = useDeepLinkTarget("promotion", promotions, {
    onFound: (promotion) => {
      setStateFilter("all");
      setEditing({ promotion });
    },
    onMissing: () => {
      showAlert({
        tone: "warning",
        title: "Esa promoción ya no está",
        description: "Se eliminó o alguien de tu equipo la cambió.",
      });
    },
  });


  const visible = useMemo(() => {
    if (!promotions) return [];
    const term = search.trim().toLowerCase();
    return promotions
      .filter((p) => matchesPromotionStateFilter(promotionState(p, now), stateFilter))
      .filter((p) => kindFilter === ALL || p.kind === kindFilter)
      .filter((p) => matchesPromotionOriginFilter(p, originFilter))
      .filter(
        (p) =>
          term === "" ||
          p.name.toLowerCase().includes(term) ||
          promotionCodes(p).some((code) => code.toLowerCase().includes(term)),
      )
      .sort((a, b) => {
        // Lo que está dando algo ahora, primero; dentro de cada grupo, lo más nuevo.
        const liveA = promotionState(a, now) === "live" ? 0 : 1;
        const liveB = promotionState(b, now) === "live" ? 0 : 1;
        if (liveA !== liveB) return liveA - liveB;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [promotions, stateFilter, kindFilter, originFilter, search, now]);

  const hasFilters =
    stateFilter !== "all" || kindFilter !== ALL || originFilter !== "all" || search.trim() !== "";
  // Gobierno declarado; a falta de lectura, hay espejo ⇒ la tienda cobra los pedidos.
  const storeGovernsOrders = ordersGoverned ?? promotions?.some(isGovernedPromotion) ?? false;
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
                showAlert({ tone: "success", title: "Promoción eliminada" });
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

  return (
    <div className="flex flex-col gap-8">
      <MarketingHeader
        title="Promociones"
        description={
          storeGovernsOrders
            ? "Las que creas aquí y las que vienen de tu tienda. La IA solo comunica; los montos los calcula el sistema."
            : "Descuentos, regalos y envío gratis que el agente aplica solo a los pedidos."
        }
        actions={
          canManage && (
            <Button className="rounded-full" onClick={() => openEditor(null)}>
              <Plus className="size-4" aria-hidden="true" />
              Nueva promoción
            </Button>
          )
        }
      />

      {loading && promotions === null ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <LoadError message={error} onRetry={() => void load()} />
      ) : isEmpty ? (
        <EmptyState
          glyph="money"
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
      ) : (
        <section aria-label="Promociones" className="border-border bg-card @container min-w-0 overflow-hidden rounded-3xl border">
          <div className="border-border flex flex-wrap items-center gap-3 border-b px-5 py-4">
            <SegmentedControl
              value={stateFilter}
              onValueChange={setStateFilter}
              label="Filtrar por estado"
              size="sm"
              items={(Object.keys(PROMOTION_STATE_FILTER_LABELS) as PromotionStateFilter[]).map((key) => ({
                value: key,
                label: PROMOTION_STATE_FILTER_LABELS[key],
              }))}
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              <Select value={kindFilter} onValueChange={(v: string) => setKindFilter(v as PromotionKind | typeof ALL)}>
                <SelectTrigger className="h-9 w-auto min-w-36 rounded-full" aria-label="Filtrar por tipo">
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
              {storeGovernsOrders && (
                <Select value={originFilter} onValueChange={(v: string) => setOriginFilter(v as PromotionOriginFilter)}>
                  <SelectTrigger className="h-9 w-auto min-w-36 rounded-full" aria-label="Filtrar por origen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROMOTION_ORIGIN_FILTER_LABELS) as PromotionOriginFilter[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {PROMOTION_ORIGIN_FILTER_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-full min-w-44 @xl:w-64">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <label className="sr-only" htmlFor="promo-search">
                  Buscar promoción
                </label>
                <Input
                  id="promo-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o código"
                  className="h-9 rounded-full pl-9"
                />
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            // Vacío POR FILTROS ≠ vacío real: el mensaje y la acción son distintos.
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="font-heading text-lg font-bold tracking-tight">
                {hasFilters ? "Ninguna promoción coincide" : "Nada que mostrar"}
              </p>
              <p className="text-muted-foreground max-w-sm text-sm text-pretty">
                {hasFilters ? "Prueba con otro estado o tipo, o limpia la búsqueda." : "Vuelve a cargar la lista para verlas."}
              </p>
              {hasFilters ? (
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setStateFilter("all");
                    setKindFilter(ALL);
                    setOriginFilter("all");
                    setSearch("");
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : (
                <Button variant="outline" className="rounded-full" onClick={() => void load()}>
                  Recargar
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-border divide-y">
              {visible.map((promotion) => (
                <PromotionCard
                  key={promotion.id}
                  promotion={promotion}
                  now={now}
                  canManage={canManage}
                  storeGovernsOrders={storeGovernsOrders}
                  onEdit={() => openEditor(promotion)}
                  onRedemptions={() => setRedemptionsOf(promotion)}
                  onToggle={() => handleToggle(promotion)}
                  onDelete={() => handleDelete(promotion)}
                />
              ))}
            </div>
          )}
          <p className="border-border text-muted-foreground border-t px-5 py-3 text-xs text-pretty">
            {visible.length.toLocaleString("es-CO")} de {(promotions?.length ?? 0).toLocaleString("es-CO")} · Los
            cupones vencen de verdad: pasada la hora, el sistema los rechaza.
          </p>
        </section>
      )}

      <DetailSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (open) return;
          setEditing(null);
          // el enlace ya se consumió: si el parámetro se queda, recargar la
          // pantalla volvería a abrir el panel
          deepLink.clear();
        }}
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
              deepLink.clear();
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
