"use client";

/**
 * Facturación de un tenant (`/platform/tenants/:id/billing`).
 *
 * **Aquí se rellena el correo de cobro, que nace vacío a propósito.** Mientras
 * esté en blanco no sale ningún aviso —ni de vencimiento, ni de mora, ni de
 * suspensión—, y hoy no existe forma de que el tenant lo ponga por su cuenta.
 */
import { useEffect, useState } from "react";
import { CalendarClock, Mail, TriangleAlert } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatTile } from "@/shared/components/features/stat-tile/StatTile";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import { ACCOUNT_STATUS_MAP, type TenantBillingAccount } from "../../../domain/billing";
import {
  useSetBillingCycle,
  useTenantBillingQuery,
  useUpdateTenantBilling,
} from "../../../infrastructure/api/hooks/use-billing";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";

type FormState = {
  legal_name: string;
  tax_id: string;
  billing_email: string;
  billing_phone: string;
  notify_email: boolean;
  notify_whatsapp: boolean;
  notify_in_app: boolean;
  grace_days: string;
  payment_terms_days: string;
  auto_charge: boolean;
};

function toForm(account: TenantBillingAccount): FormState {
  return {
    legal_name: account.legal_name,
    tax_id: account.tax_id,
    billing_email: account.billing_email,
    billing_phone: account.billing_phone ?? "",
    notify_email: account.notify_email,
    notify_whatsapp: account.notify_whatsapp,
    notify_in_app: account.notify_in_app,
    grace_days: String(account.grace_days),
    payment_terms_days: String(account.payment_terms_days),
    auto_charge: account.auto_charge,
  };
}

export function TenantBillingView({ tenantId }: { tenantId: string }) {
  const { showAlert } = useAlert();
  const { data, isPending, isError, error, refetch } = useTenantBillingQuery(tenantId);
  const update = useUpdateTenantBilling(tenantId);
  const setCycle = useSetBillingCycle(tenantId);

  const [form, setForm] = useState<FormState | null>(null);
  const [anchor, setAnchor] = useState("");

  const account = data?.account ?? null;

  // El formulario se hidrata cuando llega la cuenta, y se re-hidrata tras
  // guardar (la invalidación trae la fila del servidor, que es la autoridad).
  useEffect(() => {
    if (account !== null) setForm(toForm(account));
  }, [account]);

  if (isPending) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando facturación" aria-busy="true">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }
  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} />;

  if (account === null || form === null) {
    return (
      <EmptyState
        icon={Mail}
        accent="amber"
        title="Este tenant no tiene cuenta de cobro"
        description="Nace sola al asignarle un plan de pago. Hazlo desde el tab «Plan & Límites» y vuelve aquí para rellenar el correo de cobro."
      />
    );
  }

  const emailMissing = form.billing_email.trim() === "";

  // `values` llega por parámetro en vez de leerse del closure: el narrowing de
  // un `useState` no sobrevive dentro de la función, y con `!` el compilador
  // dejaría de avisar el día que la guarda de arriba se mueva.
  async function save(values: FormState) {
    try {
      await update.mutateAsync({
        legal_name: values.legal_name,
        tax_id: values.tax_id,
        billing_email: values.billing_email,
        billing_phone: values.billing_phone === "" ? null : values.billing_phone,
        notify_email: values.notify_email,
        notify_whatsapp: values.notify_whatsapp,
        notify_in_app: values.notify_in_app,
        grace_days: Number(values.grace_days),
        payment_terms_days: Number(values.payment_terms_days),
        auto_charge: values.auto_charge,
      });
      showAlert({
        tone: "success",
        title: "Facturación actualizada",
        autoCloseMs: 5000,
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar",
        description: errorMessage(err),
        autoCloseMs: 8000,
      });
    }
  }

  async function moveCycle() {
    if (anchor === "") return;
    try {
      await setCycle.mutateAsync(new Date(`${anchor}T00:00:00Z`).toISOString());
      showAlert({
        tone: "success",
        title: "Fecha de corte movida",
        description: "El próximo ciclo se cerrará con la fecha nueva.",
        autoCloseMs: 6000,
      });
      setAnchor("");
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo mover el corte",
        description: errorMessage(err),
        autoCloseMs: 8000,
      });
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev === null ? prev : { ...prev, [key]: value }));

  return (
    <div className="space-y-5">
      {emailMissing ? (
        <Alert className="border-warning/30 bg-warning/8">
          <TriangleAlert aria-hidden="true" className="text-warning size-4" />
          <AlertTitle>El correo de cobro está vacío</AlertTitle>
          <AlertDescription>
            Mientras esté en blanco <b>no sale ningún aviso</b>: ni de vencimiento, ni
            de mora, ni de suspensión. Y el tenant no puede rellenarlo desde su panel.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Saldo pendiente"
          value={formatMoney(data.outstanding_cents, account.currency)}
          tone={data.outstanding_cents > 0 ? "warning" : "default"}
          hint={`${String(data.open_invoices)} ${data.open_invoices === 1 ? "factura abierta" : "facturas abiertas"}`}
        />
        <StatTile
          label="Ciclo en curso"
          value={
            data.cycle === null
              ? null
              : `${formatShortDate(data.cycle.period_start)} – ${formatShortDate(data.cycle.period_end)}`
          }
          hint={data.cycle === null ? "Sin ancla de facturación" : "Corte al final del período"}
        />
        <StatTile
          label="Intento de cobranza"
          value={`${String(account.dunning_attempt)} de 4`}
          hint="Los intentos son D+0, D+1, D+3 y D+5"
        />
      </div>

      <section className="border-border rounded-2xl border p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Datos del contribuyente</h2>
          <StatusBadge status={account.status} map={ACCOUNT_STATUS_MAP} />
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="legal_name">Razón social</Label>
            <Input
              id="legal_name"
              className="mt-1.5"
              value={form.legal_name}
              onChange={(event) => set("legal_name", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tax_id">NIT</Label>
            <Input
              id="tax_id"
              className="mt-1.5 font-mono"
              value={form.tax_id}
              onChange={(event) => set("tax_id", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="billing_email">Correo de cobro</Label>
            <Input
              id="billing_email"
              type="email"
              className="mt-1.5 font-mono"
              value={form.billing_email}
              onChange={(event) => set("billing_email", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="billing_phone">Teléfono de cobro</Label>
            <Input
              id="billing_phone"
              className="mt-1.5 font-mono"
              placeholder="+57 300 000 0000"
              value={form.billing_phone}
              onChange={(event) => set("billing_phone", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="border-border rounded-2xl border p-5">
        <h2 className="mb-1 text-base font-semibold">Avisos y cobranza</h2>
        <p className="text-muted-foreground mb-3 text-xs">
          Por dónde se le avisa y cuánta gracia tiene antes de la suspensión.
        </p>

        <NotifyRow
          title="Correo"
          note="Vía Resend. Requiere el dominio verificado con SPF y DKIM, o los avisos salen a spam."
          checked={form.notify_email}
          onChange={(value) => set("notify_email", value)}
        />
        <NotifyRow
          title="WhatsApp"
          note="Queda apagado por configuración mientras no haya plantilla HSM utility aprobada: el envío se registra como fallido a propósito, para que se note."
          checked={form.notify_whatsapp}
          onChange={(value) => set("notify_whatsapp", value)}
        />
        <NotifyRow
          title="Campanita del panel"
          note="La ve quien tenga billing:read. Un tenant ya suspendido no está en el panel para verla."
          checked={form.notify_in_app}
          onChange={(value) => set("notify_in_app", value)}
        />
        <NotifyRow
          title="Cobro automático"
          note="Exige un medio de pago guardado y que el comercio esté habilitado para COF. Sin eso el débito falla siempre y degrada al enlace de pago."
          checked={form.auto_charge}
          onChange={(value) => set("auto_charge", value)}
        />

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="grace_days">Días de gracia</Label>
            <Input
              id="grace_days"
              className="mt-1.5 w-24 tabular-nums"
              inputMode="numeric"
              value={form.grace_days}
              onChange={(event) => set("grace_days", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="payment_terms_days">Plazo de pago</Label>
            <Input
              id="payment_terms_days"
              className="mt-1.5 w-24 tabular-nums"
              inputMode="numeric"
              value={form.payment_terms_days}
              onChange={(event) => set("payment_terms_days", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="border-border rounded-2xl border p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock className="text-muted-foreground size-4" aria-hidden="true" />
          Fecha de corte
        </h2>
        <p className="text-muted-foreground mt-1 mb-3 text-xs leading-relaxed">
          Mueve el ancla del ciclo. Se guarda aparte de los datos de arriba porque
          cambia <b>cuándo</b> se emite la próxima factura, no cómo se cobra.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            type="date"
            aria-label="Nueva fecha de corte"
            className="w-[170px] tabular-nums"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={anchor === "" || setCycle.isPending}
            onClick={() => void moveCycle()}
          >
            Mover el corte
          </Button>
        </div>
      </section>

      <div className="flex justify-end">
        <Button disabled={update.isPending} onClick={() => void save(form)}>
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function NotifyRow({
  title,
  note,
  checked,
  onChange,
}: {
  title: string;
  note: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="border-border/60 flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5 max-w-[52ch] text-xs leading-relaxed">
          {note}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
