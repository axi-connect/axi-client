"use client";

import { useEffect } from "react";
import { CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";

import type { GovernanceState } from "@/modules/integrations/domain/integration";
import { useIntegrationsStore } from "@/modules/integrations/infrastructure/stores/integrations.store";

/**
 * Pestaña Pedidos: SOLO LECTURA a propósito (D3) — quién gobierna el catálogo
 * y los pedidos lo decide la plataforma, no el tenant. El tenant conecta y
 * configura; el gobierno es una decisión comercial que se activa desde la
 * consola de axi. El tri-estado viene derivado del backend (regla 3).
 */
export function OrdersTab() {
  const governance = useIntegrationsStore((s) => s.governance);
  const fetchIntegrations = useIntegrationsStore((s) => s.fetchIntegrations);

  useEffect(() => {
    if (governance === null) void fetchIntegrations();
  }, [governance, fetchIntegrations]);

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-3 rounded-lg border border-border p-4 md:p-6">
        <GovernanceRow
          label="Catálogo e inventario"
          state={governance?.catalog ?? "local"}
          activeText="Los gobierna tu tienda: axi mantiene un espejo que se actualiza solo, y esos productos son de solo lectura aquí."
          localText="Los gobierna axi: editas productos y stock desde el panel, como siempre."
        />
        <GovernanceRow
          label="Pedidos"
          state={governance?.orders ?? "local"}
          activeText="Los cobra tu tienda: al confirmar un pedido, el cliente recibe un link de pago de tu checkout y el stock lo descuenta la tienda."
          localText="Se cobran en axi: comprobante de pago y verificación manual, como siempre."
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Este ajuste lo activa el equipo de axi según tu plan. Si quieres cambiar quién gobierna tu
        catálogo o tus cobros, escríbenos y lo revisamos contigo.
      </p>
    </div>
  );
}

function GovernanceRow({
  label,
  state,
  activeText,
  localText,
}: {
  label: string;
  state: GovernanceState;
  activeText: string;
  localText: string;
}) {
  return (
    <div className="flex gap-3">
      {state === "provider_active" ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-success" />
      ) : state === "provider_declared_not_connected" ? (
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-warning" />
      ) : (
        <CircleDashed aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {state === "provider_active"
            ? activeText
            : state === "provider_declared_not_connected"
              ? "Declarado a la tienda, pero la conexión no está operativa: mientras tanto funciona en modo local. Rota las credenciales para destrabarla."
              : localText}
        </p>
      </div>
    </div>
  );
}
