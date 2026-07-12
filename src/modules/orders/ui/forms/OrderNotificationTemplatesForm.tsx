"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import type { OrderNotificationSettingsDTO } from "@/modules/orders/domain/order";
import {
  getOrderNotificationSettings,
  updateOrderNotificationSettings,
} from "@/modules/orders/infrastructure/services/order-settings-service.adapter";

type TemplateKey = keyof OrderNotificationSettingsDTO["templates"];

const TEMPLATE_META: Array<{ key: TemplateKey; title: string; hint: string }> = [
  { key: "confirmed", title: "Pedido confirmado", hint: "Al confirmar el pedido (descuenta inventario)." },
  { key: "paid", title: "Pago verificado", hint: "Cuando verificas el pago y el pedido queda pagado." },
  { key: "fulfilled", title: "Pedido entregado", hint: "Al marcar el pedido como entregado." },
  { key: "cancelled", title: "Pedido cancelado", hint: "Al cancelar el pedido." },
  { key: "payment_rejected", title: "Pago rechazado", hint: "Al rechazar un comprobante (el pedido vuelve a su estado anterior)." },
];

const VARIABLES = ["{{contact_name}}", "{{order_number}}", "{{total}}", "{{status}}"];

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

  useEffect(() => {
    getOrderNotificationSettings()
      .then(setSettings)
      .catch((err) => setLoadError(errorMessage(err, "No se pudieron cargar las plantillas")));
  }, []);

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
      showAlert({ tone: "success", title: "Plantillas guardadas", open: true, autoCloseMs: 3000 });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudieron guardar las plantillas",
        description: errorMessage(err),
        open: true,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadError !== null) {
    return <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{loadError}</p>;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Notificaciones de pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mensajes de WhatsApp que reciben tus clientes cuando su pedido cambia de estado.
          Variables disponibles:{" "}
          {VARIABLES.map((variable) => (
            <code key={variable} className="mx-0.5 rounded bg-secondary px-1 py-0.5 font-mono text-xs">
              {variable}
            </code>
          ))}
        </p>
      </div>

      <div className="space-y-4">
        {TEMPLATE_META.map(({ key, title, hint }) => {
          const template = settings.templates[key];
          return (
            <section key={key} className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor={`tpl-${key}`} className="text-sm font-semibold">
                    {title}
                  </Label>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  id={`tpl-${key}-enabled`}
                  aria-label={`Habilitar aviso: ${title}`}
                  checked={template.enabled}
                  onCheckedChange={(enabled) => patch(key, { enabled })}
                />
              </div>
              <Textarea
                id={`tpl-${key}`}
                value={template.body}
                maxLength={1000}
                rows={3}
                disabled={!template.enabled}
                onChange={(e) => patch(key, { body: e.target.value })}
              />
            </section>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Guardar plantillas
        </Button>
      </div>
    </div>
  );
}
