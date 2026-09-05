"use client";

/**
 * Promociones (`/platform/billing/promotions`): un descuento con fecha, cupos
 * y política de congelamiento. El cupo se RESERVA al confirmar la oferta y se
 * TOMA al pagar; el contador público de la landing sale de aquí
 * (`reserved_slots + reservadas + activas`), nunca de una constante.
 */
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  INDEXATION_LABELS,
  PROMOTION_SCOPE_LABELS,
  REDEMPTION_STATUS_MAP,
  type BillingPromotion,
  type IndexationPolicy,
  type PromotionRedemption,
  type PromotionScope,
  type RedemptionStatus,
} from "../../../domain/billing";
import {
  useAddManualRedemption,
  useClosePromotion,
  useCreatePromotion,
  usePromotionsQuery,
  useSetRedemptionStatus,
  useUpdatePromotion,
} from "../../../infrastructure/api/hooks/use-catalog";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";

type RedemptionFilter = "all" | RedemptionStatus;

export function PromotionsView() {
  const promotions = usePromotionsQuery();
  const [editing, setEditing] = useState<BillingPromotion | "new" | null>(null);
  const [redeeming, setRedeeming] = useState<BillingPromotion | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (promotions.isPending) return <TableSkeleton rows={4} />;
  if (promotions.isError) {
    return (
      <ProblemAlert
        error={promotions.error}
        onRetry={() => void promotions.refetch()}
        className="mx-auto max-w-xl"
      />
    );
  }
  const rows = promotions.data.data;
  const selected = rows.find((promo) => promo.id === selectedId) ?? rows[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand text-[10.5px] font-semibold tracking-[0.12em] uppercase">Adquisición</p>
          <h1 className="text-3xl font-semibold tracking-tight">Promociones</h1>
          <p className="text-muted-foreground max-w-[70ch] text-sm">
            Un descuento con fecha, cupos y política de congelamiento. El cupo se <b>reserva</b> al
            confirmar y se <b>toma</b> al pagar. El contador público sale de aquí, nunca de una constante.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden="true" />
          Nueva promoción
        </Button>
      </header>

      {rows.length === 0 || selected === null ? (
        <EmptyState
          glyph="money"
          title="Sin promociones"
          description="La landing muestra precio de lista. Crea una promoción para publicar un descuento con fecha y cupos."
          action={<Button variant="outline" onClick={() => setEditing("new")}>Crear la primera</Button>}
        />
      ) : (
        <>
          {rows.length > 1 ? (
            <SegmentedControl
              label="Promoción"
              value={selected.id}
              onValueChange={setSelectedId}
              items={rows.map((promo) => ({ value: promo.id, label: promo.name }))}
              size="sm"
            />
          ) : null}

          <PromotionSummary promotion={selected} />

          <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <PromotionCard
              promotion={selected}
              onEdit={() => setEditing(selected)}
              onRedeem={() => setRedeeming(selected)}
            />
            <RedemptionsTable promotion={selected} />
          </div>
        </>
      )}

      <PromotionSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        promotion={editing === "new" ? null : editing}
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
      />
      <RedemptionSheet
        open={redeeming !== null}
        onOpenChange={(open) => !open && setRedeeming(null)}
        promotion={redeeming}
        key={redeeming?.id ?? "closed"}
      />
    </div>
  );
}

/** Cuatro fichas: cupos, cierre, política y redenciones vivas. */
function PromotionSummary({ promotion }: { promotion: BillingPromotion }) {
  const { counters } = promotion;
  const daysLeft =
    promotion.ends_at === null
      ? null
      : Math.max(0, Math.ceil((new Date(promotion.ends_at).getTime() - Date.now()) / 86_400_000));
  const slots = promotion.max_slots;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Tile label="Cupos">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {counters.taken}
          {slots === null ? <span className="text-muted-foreground text-sm font-medium"> sin tope</span> : <span className="text-muted-foreground text-sm font-medium"> de {slots}</span>}
        </p>
        {slots !== null ? <SlotStrip promotion={promotion} /> : null}
        <p className="text-muted-foreground text-xs">
          {promotion.reserved_slots} reservados a mano · {counters.active} activas · {counters.reserved} en reserva
          {slots !== null ? ` · ${Math.max(0, slots - counters.taken)} libres` : ""}
        </p>
      </Tile>
      <Tile label="Cierra en">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {daysLeft === null ? "—" : daysLeft}
          <span className="text-muted-foreground text-sm font-medium">{daysLeft === null ? " sin fecha" : " días"}</span>
        </p>
        <p className="text-muted-foreground text-xs">
          {formatShortDate(promotion.starts_at)} → {promotion.ends_at === null ? "sin fin" : formatShortDate(promotion.ends_at)}
        </p>
      </Tile>
      <Tile label="Descuento">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">−{(promotion.percent_bps / 100).toFixed(0)} %</p>
        <p className="text-muted-foreground text-xs">
          {promotion.rounding === "floor_900" ? "redondeo al .900 inferior" : "sin redondeo"} · {PROMOTION_SCOPE_LABELS[promotion.scope]}
        </p>
      </Tile>
      <Tile label="Congelamiento">
        <p className="text-2xl font-semibold tracking-tight">{INDEXATION_LABELS[promotion.indexation_policy]}</p>
        <p className="text-muted-foreground text-xs">
          {promotion.indexation_policy === "ipc_annual"
            ? `primer ajuste ${promotion.indexation_first_year ?? "primer enero"}`
            : "precio fijo en pesos mientras siga"}
          {promotion.stacks_with_annual ? " · se apila con el anual" : ""}
        </p>
      </Tile>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border-soft bg-card flex flex-col gap-1.5 rounded-2xl border p-4 shadow-[var(--shadow-float)]">
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide">{label}</span>
      {children}
    </div>
  );
}

/** Veinte cuadritos: reservados a mano, activos, en reserva y libres. */
function SlotStrip({ promotion }: { promotion: BillingPromotion }) {
  const slots = promotion.max_slots ?? 0;
  if (slots === 0 || slots > 60) return null;
  const cells = Array.from({ length: slots }, (_, index) => {
    if (index < promotion.reserved_slots) return { kind: "manual", title: "reservado a mano" };
    if (index < promotion.reserved_slots + promotion.counters.active) return { kind: "active", title: "activo · pagado" };
    if (index < promotion.counters.taken) return { kind: "reserved", title: "en reserva" };
    return { kind: "free", title: "libre" };
  });
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(slots, 20)}, minmax(0, 1fr))` }} aria-hidden="true">
      {cells.map((cell, index) => (
        <span
          key={index}
          title={cell.title}
          className={
            cell.kind === "active"
              ? "bg-brand aspect-square rounded-[3px]"
              : cell.kind === "reserved"
                ? "bg-brand/40 outline-brand aspect-square rounded-[3px] outline-1 -outline-offset-1 outline-dashed"
                : cell.kind === "manual"
                  ? "bg-foreground/35 aspect-square rounded-[3px]"
                  : "bg-secondary aspect-square rounded-[3px]"
          }
        />
      ))}
    </div>
  );
}

function PromotionCard({
  promotion,
  onEdit,
  onRedeem,
}: {
  promotion: BillingPromotion;
  onEdit: () => void;
  onRedeem: () => void;
}) {
  const { showAlert } = useAlert();
  const close = useClosePromotion();
  async function closePromotion() {
    try {
      await close.mutateAsync(promotion.id);
      showAlert({
        tone: "success",
        title: "Promoción cerrada",
        description: "Sale de la venta hoy. Las redenciones activas conservan su precio.",
        autoCloseMs: 7000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo cerrar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }
  return (
    <section className="border-border-soft bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-[var(--shadow-float)]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{promotion.name}</h2>
          <p className="text-muted-foreground font-mono text-xs">{promotion.code}</p>
        </div>
        <Badge
          variant="outline"
          className={promotion.is_active ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground"}
        >
          {promotion.is_active ? "Abierta" : "Cerrada"}
        </Badge>
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Pública</dt>
        <dd>{promotion.is_public ? "Sí · redimible desde /comenzar" : "No · solo por ventas"}</dd>
        <dt className="text-muted-foreground">Aplica a</dt>
        <dd>{PROMOTION_SCOPE_LABELS[promotion.scope]}</dd>
        <dt className="text-muted-foreground">Con anual</dt>
        <dd>{promotion.stacks_with_annual ? "Se apila · precio con descuento × 11" : "No se apila"}</dd>
        <dt className="text-muted-foreground">Reservados</dt>
        <dd className="tabular-nums">{promotion.reserved_slots} cupos apartados fuera del autoservicio</dd>
      </dl>
      <p className="text-muted-foreground border-warning/30 bg-warning/8 rounded-xl border p-3 text-xs leading-relaxed">
        La política de congelamiento va en <b>cada redención</b>: quien firmó «congelada» queda en «Sin ajuste»
        aunque la promoción pase a IPC anual. Cambiarla aquí no toca a los que ya redimieron.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="outline" size="sm" onClick={onRedeem} disabled={!promotion.is_active}>
          Redención manual
        </Button>
        {promotion.is_active ? (
          <Button variant="ghost" size="sm" disabled={close.isPending} onClick={() => void closePromotion()}>
            Cerrar promoción
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function RedemptionsTable({ promotion }: { promotion: BillingPromotion }) {
  const { showAlert } = useAlert();
  const setStatus = useSetRedemptionStatus();
  const [filter, setFilter] = useState<RedemptionFilter>("all");
  const rows = useMemo(
    () => promotion.redemptions.filter((row) => filter === "all" || row.status === filter),
    [promotion.redemptions, filter],
  );
  const count = (status: RedemptionStatus) => promotion.redemptions.filter((row) => row.status === status).length;

  async function change(redemption: PromotionRedemption, status: "active" | "released") {
    try {
      await setStatus.mutateAsync({ promotionId: promotion.id, redemptionId: redemption.id, status });
      showAlert({
        tone: "success",
        title: status === "active" ? "Redención activada" : "Cupo liberado",
        description: `${redemption.company_name} · el contador público ya lo refleja.`,
        autoCloseMs: 6000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo cambiar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <section className="border-border-soft bg-card rounded-2xl border shadow-[var(--shadow-float)]">
      <header className="flex flex-wrap items-start justify-between gap-3 p-4 pb-2">
        <div>
          <h2 className="text-[15px] font-semibold">Redenciones</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Reserva al confirmar (vive lo que el link de pago); activa al aprobarse el pago; liberada si vence.
          </p>
        </div>
        <SegmentedControl
          label="Filtrar redenciones"
          size="sm"
          surface="inline"
          value={filter}
          onValueChange={setFilter}
          items={[
            { value: "all", label: "Todas", count: promotion.redemptions.length },
            { value: "active", label: "Activas", count: count("active") },
            { value: "reserved", label: "Reservadas", count: count("reserved") },
            { value: "released", label: "Liberadas", count: count("released") },
          ]}
        />
      </header>
      {rows.length === 0 ? (
        <p className="text-muted-foreground px-4 pb-5 text-sm">
          {promotion.redemptions.length === 0
            ? "Nadie ha redimido esta promoción todavía. Los cupos reservados a mano cuentan igual en el contador."
            : "Ninguna redención con este estado."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-border-soft border-y text-[11px] tracking-wide uppercase">
                <th className="px-4 py-2.5 text-left font-medium">Empresa</th>
                <th className="px-4 py-2.5 text-left font-medium">Origen</th>
                <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                <th className="px-4 py-2.5 text-left font-medium">Congelamiento</th>
                <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={`border-border-soft border-b last:border-0 ${row.status === "released" || row.status === "expired" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <b className="font-medium">{row.company_name}</b>
                    {row.note ? <div className="text-muted-foreground text-xs">{row.note}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={row.source === "self_service" ? "border-info/40 bg-info/10 text-info" : "text-muted-foreground"}>
                      {row.source === "self_service" ? "autoservicio" : "manual"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} map={REDEMPTION_STATUS_MAP} />
                    {row.status === "reserved" && row.expires_at ? (
                      <span className="text-muted-foreground ml-2 text-xs">vence {formatShortDate(row.expires_at)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={row.indexation_policy === "ipc_annual" ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet" : "text-muted-foreground"}>
                      {INDEXATION_LABELS[row.indexation_policy]}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs tabular-nums">
                    {formatShortDate(row.activated_at ?? row.reserved_at)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.status === "reserved" ? (
                      <>
                        <Button variant="ghost" size="sm" disabled={setStatus.isPending} onClick={() => void change(row, "active")}>
                          Activar
                        </Button>
                        <Button variant="ghost" size="sm" disabled={setStatus.isPending} onClick={() => void change(row, "released")}>
                          Liberar
                        </Button>
                      </>
                    ) : row.status === "active" ? (
                      <Button variant="ghost" size="sm" disabled={setStatus.isPending} onClick={() => void change(row, "released")}>
                        Liberar
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const toDateInput = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : "");

function PromotionSheet({
  open,
  onOpenChange,
  promotion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: BillingPromotion | null;
}) {
  const { showAlert } = useAlert();
  const create = useCreatePromotion();
  const update = useUpdatePromotion();
  const [code, setCode] = useState(promotion?.code ?? "");
  const [name, setName] = useState(promotion?.name ?? "");
  const [percent, setPercent] = useState(promotion ? String(promotion.percent_bps / 100) : "40");
  const [rounding, setRounding] = useState<"none" | "floor_900">(promotion?.rounding ?? "floor_900");
  const [startsAt, setStartsAt] = useState(toDateInput(promotion?.starts_at) || new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(toDateInput(promotion?.ends_at));
  const [maxSlots, setMaxSlots] = useState(promotion?.max_slots == null ? "" : String(promotion.max_slots));
  const [reserved, setReserved] = useState(String(promotion?.reserved_slots ?? 0));
  const [scope, setScope] = useState<PromotionScope>(promotion?.scope ?? "all");
  const [policy, setPolicy] = useState<IndexationPolicy>(promotion?.indexation_policy ?? "none");
  const [firstYear, setFirstYear] = useState(promotion?.indexation_first_year == null ? "" : String(promotion.indexation_first_year));
  const [stacks, setStacks] = useState(promotion?.stacks_with_annual ?? true);
  const [isPublic, setIsPublic] = useState(promotion?.is_public ?? true);

  const percentBps = Math.round(Number(percent.replace(",", ".")) * 100);
  const ready =
    (promotion !== null || /^[a-z0-9_]{3,40}$/.test(code)) &&
    name.trim().length >= 2 &&
    percentBps > 0 &&
    percentBps < 10_000 &&
    startsAt !== "" &&
    (maxSlots === "" || Number(maxSlots) > 0) &&
    Number(reserved) >= 0;

  async function submit() {
    const body = {
      name: name.trim(),
      percent_bps: percentBps,
      rounding,
      starts_at: new Date(`${startsAt}T05:00:00Z`).toISOString(),
      // La promo cierra al TERMINAR el día en Bogotá: 00:00 del día siguiente = 05:00Z.
      ends_at: endsAt === "" ? null : new Date(new Date(`${endsAt}T05:00:00Z`).getTime() + 86_400_000).toISOString(),
      max_slots: maxSlots === "" ? null : Number(maxSlots),
      reserved_slots: Number(reserved),
      scope,
      stacks_with_annual: stacks,
      indexation_policy: policy,
      indexation_first_year: policy === "ipc_annual" && firstYear !== "" ? Number(firstYear) : null,
      is_public: isPublic,
    };
    try {
      if (promotion === null) {
        await create.mutateAsync({ code, ...body });
        showAlert({ tone: "success", title: "Promoción creada", description: "Ya cuenta en el catálogo público si está abierta.", autoCloseMs: 6000 });
      } else {
        await update.mutateAsync({ promotionId: promotion.id, body });
        showAlert({ tone: "success", title: "Promoción actualizada", description: "Las redenciones existentes conservan su política.", autoCloseMs: 6000 });
      }
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={promotion === null ? "Nueva promoción" : `Editar ${promotion.name}`}
      subtitle={promotion === null ? "El código no se cambia después." : promotion.code}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {promotion === null ? (
            <div>
              <Label htmlFor="promo-code">Código *</Label>
              <Input id="promo-code" className="mt-1.5 font-mono" placeholder="founders_2026" value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
          ) : null}
          <div className={promotion === null ? "" : "sm:col-span-2"}>
            <Label htmlFor="promo-name">Nombre público *</Label>
            <Input id="promo-name" className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="promo-percent">Descuento (%) *</Label>
            <Input id="promo-percent" className="mt-1.5 tabular-nums" inputMode="decimal" value={percent} onChange={(event) => setPercent(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="promo-rounding">Redondeo</Label>
            <Select value={rounding} onValueChange={(value) => setRounding(value as "none" | "floor_900")}>
              <SelectTrigger id="promo-rounding" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floor_900">Al .900 inferior</SelectItem>
                <SelectItem value="none">Sin redondeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="promo-starts">Empieza *</Label>
            <Input id="promo-starts" type="date" className="mt-1.5 tabular-nums" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="promo-ends">Termina (incluido)</Label>
            <Input id="promo-ends" type="date" className="mt-1.5 tabular-nums" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="promo-max">Cupos máximos</Label>
            <Input id="promo-max" className="mt-1.5 tabular-nums" inputMode="numeric" placeholder="sin tope" value={maxSlots} onChange={(event) => setMaxSlots(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="promo-reserved">Cupos reservados</Label>
            <Input id="promo-reserved" className="mt-1.5 tabular-nums" inputMode="numeric" value={reserved} onChange={(event) => setReserved(event.target.value)} />
            <p className="text-muted-foreground mt-1 text-xs">Se suman al contador público. Bajar uno cuando un piloto convierta.</p>
          </div>
          <div>
            <Label htmlFor="promo-scope">Aplica a</Label>
            <Select value={scope} onValueChange={(value) => setScope(value as PromotionScope)}>
              <SelectTrigger id="promo-scope" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROMOTION_SCOPE_LABELS) as PromotionScope[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {PROMOTION_SCOPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="promo-policy">Congelamiento de las redenciones nuevas</Label>
            <Select value={policy} onValueChange={(value) => setPolicy(value as IndexationPolicy)}>
              <SelectTrigger id="promo-policy" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipc_annual">Perpetuo indexado al IPC</SelectItem>
                <SelectItem value="none">Perpetuo sin ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {policy === "ipc_annual" ? (
            <div>
              <Label htmlFor="promo-year">Primer año de ajuste</Label>
              <Input id="promo-year" className="mt-1.5 tabular-nums" inputMode="numeric" placeholder="2028" value={firstYear} onChange={(event) => setFirstYear(event.target.value)} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="accent-brand size-4" checked={stacks} onChange={(event) => setStacks(event.target.checked)} />
            Se apila con el mes gratis del anual
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="accent-brand size-4" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            Pública · redimible desde /comenzar
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!ready || create.isPending || update.isPending} onClick={() => void submit()}>
            {promotion === null ? "Crear promoción" : "Guardar"}
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}

function RedemptionSheet({
  open,
  onOpenChange,
  promotion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: BillingPromotion | null;
}) {
  const { showAlert } = useAlert();
  const add = useAddManualRedemption();
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState<"reserved" | "active">("active");
  const [policy, setPolicy] = useState<"inherit" | IndexationPolicy>("inherit");
  const [note, setNote] = useState("");
  const ready = /^[0-9a-f-]{36}$/i.test(companyId.trim());

  async function submit() {
    if (promotion === null) return;
    try {
      await add.mutateAsync({
        promotionId: promotion.id,
        body: {
          company_id: companyId.trim(),
          status,
          price_id: null,
          indexation_policy: policy === "inherit" ? null : policy,
          note: note.trim() === "" ? null : note.trim(),
        },
      });
      showAlert({ tone: "success", title: "Redención creada", description: "Toma un cupo. El contador público ya lo refleja.", autoCloseMs: 6000 });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo redimir", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} size="md" title="Redención manual" subtitle="Pilotos y acuerdos cerrados por ventas. Toma un cupo bajo bloqueo.">
      <div className="flex flex-col gap-4 p-5">
        <div>
          <Label htmlFor="red-company">ID de la empresa (tenant) *</Label>
          <Input id="red-company" className="mt-1.5 font-mono text-xs" placeholder="uuid del tenant, desde Tenants" value={companyId} onChange={(event) => setCompanyId(event.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="red-status">Estado</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as "reserved" | "active")}>
              <SelectTrigger id="red-status" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa · ya paga con la promo</SelectItem>
                <SelectItem value="reserved">Reservada · apartada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="red-policy">Congelamiento</Label>
            <Select value={policy} onValueChange={(value) => setPolicy(value as "inherit" | IndexationPolicy)}>
              <SelectTrigger id="red-policy" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">La de la promoción</SelectItem>
                <SelectItem value="none">Sin ajuste · firmó «congelada»</SelectItem>
                <SelectItem value="ipc_annual">IPC anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="red-note">Nota</Label>
          <Input id="red-note" className="mt-1.5" placeholder="piloto convertido" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <p className="text-muted-foreground border-info/24 bg-info/8 rounded-xl border p-3 text-xs leading-relaxed">
          Si la empresa era uno de los cupos reservados a mano, baja «Cupos reservados» en la promoción para no contarla dos veces.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!ready || add.isPending} onClick={() => void submit()}>
            Crear redención
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}
