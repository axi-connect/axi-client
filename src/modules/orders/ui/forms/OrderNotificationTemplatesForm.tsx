"use client";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { cn } from "@/core/lib/utils";
import type { OrderNotificationSettingsDTO } from "@/modules/orders/domain/order";
import {
  getOrderNotificationSettings,
  updateOrderNotificationSettings,
} from "@/modules/orders/infrastructure/services/order-settings-service.adapter";

type TemplateKey = keyof OrderNotificationSettingsDTO["templates"];

const TEMPLATE_META: Array<{ key: TemplateKey; title: string; hint: string }> = [
  { key: "confirmed", title: "Pedido confirmado", hint: "Al confirmar el pedido (descuenta inventario)." },
  { key: "paid", title: "Pedido cobrado", hint: "Solo cuando el saldo llega a cero. Antes salía con el primer pago, aunque quedara casi todo por cobrar." },
  { key: "payment_received", title: "Abono recibido", hint: "Cada vez que verificas un abono: el cliente que paga por partes lo recibe varias veces." },
  { key: "fulfilled", title: "Pedido entregado", hint: "Al marcar el pedido como entregado." },
  { key: "cancelled", title: "Pedido cancelado", hint: "Al cancelar el pedido." },
  { key: "payment_rejected", title: "Pago rechazado", hint: "Al rechazar un comprobante (el pedido vuelve a su estado anterior)." },
];

const VARIABLES = ["{{contact_name}}", "{{order_number}}", "{{total}}", "{{status}}"];

/**
 * Variables propias de una plantilla. El importe y el saldo solo se resuelven
 * en el aviso del abono; en otra plantilla quedarían literales, que es la señal
 * de que la variable está en el sitio equivocado.
 */
const EXTRA_VARIABLES: Partial<Record<TemplateKey, string[]>> = {
  payment_received: ["{{amount}}", "{{balance}}"],
};

/**
 * Plantillas del aviso WhatsApp al cliente por transición de pedido (F11).
 * Opt-in por plantilla: aunque el operador deje "Notificar al cliente"
 * activado, sin plantilla habilitada no se envía nada.
 */
export function OrderNotificationTemplatesForm() {
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState<OrderNotificationSettingsDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TemplateKey>("payment_received");

  const load = useCallback(() => {
    setLoadError(null);
    getOrderNotificationSettings()
      .then(setSettings)
      .catch((err) => setLoadError(errorMessage(err, "No se pudieron cargar las plantillas")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patch(key: TemplateKey, partial: Partial<{ enabled: boolean; body: string }>) {
    setSettings((prev) =>
      prev === null
        ? prev
        : { templates: { ...prev.templates, [key]: { ...prev.templates[key], ...partial } } },
    );
  }

  async function save() {
    if (settings === null) return;
    setSaving(true);
    try {
      const saved = await updateOrderNotificationSettings(settings);
      setSettings(saved);
      showAlert({ tone: "success", title: "Plantillas guardadas" });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudieron guardar",
        description: `Las plantillas siguen como estaban. ${errorMessage(err)}`,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadError !== null) {
    // §9.4: un fallo al cargar es un estado de la vista → Alert en línea con salida.
    return (
      <Alert variant="destructive">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>No se pudieron cargar las plantillas</AlertTitle>
        <AlertDescription>
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" className="mt-2 w-fit" onClick={load}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (settings === null) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando plantillas">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const meta = TEMPLATE_META.find((entry) => entry.key === selected) ?? TEMPLATE_META[0]!;
  const current = settings.templates[meta.key];
  const own = EXTRA_VARIABLES[meta.key] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight sm:text-3xl">Notificaciones de pedidos</h1>
        <p className="mt-1 max-w-[72ch] text-sm text-muted-foreground">
          Mensajes de WhatsApp que reciben tus clientes cuando su pedido cambia de estado. Sin plantilla encendida no sale
          nada.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_minmax(17rem,21rem)] [&>*]:min-w-0">
        <nav aria-label="Avisos" className="flex flex-col gap-1 rounded-3xl border border-border bg-card p-2">
          {TEMPLATE_META.map(({ key, title }) => {
            const template = settings.templates[key];
            const active = key === meta.key;
            return (
              <div key={key} className={cn("flex items-center gap-2 rounded-2xl px-3 py-2", active && "bg-muted")}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setSelected(key)}
                  className="min-h-10 min-w-0 flex-1 truncate text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {title}
                </button>
                <Switch
                  size="lg"
                  id={`tpl-${key}-enabled`}
                  aria-label={`Habilitar aviso: ${title}`}
                  checked={template.enabled}
                  onCheckedChange={(enabled) => patch(key, { enabled })}
                />
              </div>
            );
          })}
        </nav>

        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Plantilla</p>
            <Label htmlFor={`tpl-${meta.key}`} className="font-heading text-2xl font-bold tracking-tight">
              {meta.title}
            </Label>
            <p className="text-sm text-pretty text-foreground/80">{meta.hint}</p>
          </div>
          <Textarea
            id={`tpl-${meta.key}`}
            value={current.body}
            maxLength={1000}
            rows={5}
            disabled={!current.enabled}
            onChange={(e) => patch(meta.key, { body: e.target.value })}
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Insertar</p>
            <div className="flex flex-wrap gap-1.5">
              {[...own, ...VARIABLES].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  disabled={!current.enabled}
                  onClick={() => patch(meta.key, { body: `${current.body}${current.body.endsWith(" ") || current.body === "" ? "" : " "}${variable}` })}
                  className={cn(
                    "h-8 rounded-full border bg-card px-3 font-mono text-xs disabled:opacity-50",
                    own.includes(variable) ? "border-foreground" : "border-border",
                  )}
                >
                  {variable}
                </button>
              ))}
            </div>
            {own.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Solo aquí se resuelven{" "}
                {own.map((variable) => (
                  <code key={variable} className="mx-0.5 rounded bg-secondary px-1 py-0.5 font-mono text-xs">
                    {variable}
                  </code>
                ))}
                : el importe del abono y el saldo que queda.
              </p>
            ) : null}
          </div>
          <div className="mt-auto flex justify-end border-t border-border/60 pt-4">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Guardar plantillas
            </Button>
          </div>
        </section>

        <InkIsland label="Así le llega" className="gap-4 lg:col-span-2 xl:col-span-1">
          <Kicker>Así le llega</Kicker>
          <p className="font-heading text-xl leading-tight font-bold tracking-tight">
            {current.enabled ? "Con datos de ejemplo" : "Este aviso está apagado"}
          </p>
          {current.enabled ? (
            <p className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
              {previewBody(current.body, meta.key)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No sale nada al cliente en este cambio del pedido.</p>
          )}
          <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
            Ejemplo: Ana, pedido 45, un total de $ 27.797.980; en el abono, $ 5.000.000 y un saldo de $ 14.458.586.
          </p>
        </InkIsland>
      </div>
    </div>
  );
}

/** El `{{status}}` de cada aviso: el estado en que queda el pedido (etiquetas cortas del servidor). */
const PREVIEW_STATUS: Record<TemplateKey, string> = {
  confirmed: "confirmado",
  paid: "pagado",
  payment_received: "confirmado",
  fulfilled: "entregado",
  cancelled: "cancelado",
  payment_rejected: "confirmado",
  checkout_link: "pendiente",
};

/**
 * El texto con datos de ejemplo, relleno como `renderTemplate` del servidor:
 * `{{order_number}}` es el número a secas («45»), acepta espacios dentro de las
 * llaves y el importe y el saldo SOLO se resuelven en el aviso del abono — en
 * otro aviso quedan literales, que es la señal de que están en el sitio
 * equivocado. Una variable desconocida también queda literal.
 */
export function previewBody(body: string, key: TemplateKey = "payment_received"): string {
  const values: Record<string, string> = {
    order_number: "45",
    total: "$ 27.797.980",
    contact_name: "Ana",
    status: PREVIEW_STATUS[key],
    ...(key === "payment_received" ? { amount: "$ 5.000.000", balance: "$ 14.458.586" } : {}),
    ...(key === "checkout_link" ? { checkout_url: "https://pagos.ejemplo.com/45" } : {}),
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (literal, name: string) => (name in values ? values[name] : literal));
}
