"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import type { ShippingSettingsDTO } from "@/modules/shipping/domain/shipping";
import { updateShippingSettings } from "@/modules/shipping/infrastructure/services/shipping-service.adapter";

/**
 * «Cómo cotiza la IA» (mockup): dos interruptores y una regla fija (E6: la
 * tarifa más barata; alternativas solo si el cliente pregunta). `ai_enabled`
 * es lo que carga la tool `set_delivery` en el agente.
 */
export function QuotePolicyCard({
  settings,
  canManage,
  hasZones,
  onSaved,
}: {
  settings: ShippingSettingsDTO;
  canManage: boolean;
  hasZones: boolean;
  onSaved: (saved: ShippingSettingsDTO) => void;
}) {
  const { showAlert } = useAlert();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const dirty =
    draft.ai_enabled !== settings.ai_enabled ||
    draft.require_address_before_confirm !== settings.require_address_before_confirm;

  const save = async () => {
    setSaving(true);
    try {
      const saved = await updateShippingSettings({
        ai_enabled: draft.ai_enabled,
        require_address_before_confirm: draft.require_address_before_confirm,
      });
      onSaved(saved);
      showAlert({ tone: "success", title: "Cotización de envíos guardada", open: true, autoCloseMs: 3000 });
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar",
        description: errorMessage(error),
        open: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Cómo cotiza la IA</h2>
        <p className="text-sm text-muted-foreground">
          Con esto encendido, el agente pregunta ciudad y departamento y dice el valor del envío antes de cerrar.
        </p>
      </div>

      <div className="divide-y divide-border/60">
        <PolicyRow
          id="shipping-ai-enabled"
          title="Cotizar envíos por chat"
          hint={
            hasZones
              ? "La IA pregunta ciudad y departamento y dice el valor del envío."
              : "Necesitas al menos una zona con tarifa: sin zonas la IA no tiene qué cotizar."
          }
          checked={draft.ai_enabled}
          disabled={!canManage}
          onChange={(ai_enabled) => setDraft((prev) => ({ ...prev, ai_enabled }))}
        />
        <PolicyRow
          id="shipping-require-address"
          title="Pedir la dirección antes de cerrar"
          hint="Sin dirección completa no se confirma el pedido."
          checked={draft.require_address_before_confirm}
          disabled={!canManage}
          onChange={(require_address_before_confirm) =>
            setDraft((prev) => ({ ...prev, require_address_before_confirm }))
          }
        />
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium">Si hay varias tarifas</p>
            <p className="text-xs text-muted-foreground">
              La IA aplica la más barata y ofrece las otras solo si el cliente pregunta.
            </p>
          </div>
          <Badge variant="secondary">Regla fija</Badge>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      )}
    </section>
  );
}

function PolicyRow({
  id,
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
