"use client";

import { useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import {
  buildConnectPayload,
  connectCtaLabel,
  connectErrorFallback,
  connectingLabel,
  type AccessTokenConnectConfig,
  type CredentialFieldSpec,
  type IntegrationProviderDescriptor,
} from "@/modules/integrations/domain/integration-providers";
import { connectIntegration } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import { useIntegrationsStore } from "@/modules/integrations/infrastructure/stores/integrations.store";

/**
 * Paso «Conexión» por credenciales: el formulario se GENERA desde el
 * descriptor (`external_account_field` + `credential_fields`), no se escribe
 * por proveedor — para Shopify produce exactamente los tres campos que antes
 * estaban hardcodeados (hallazgo M7: token + clave secreta, no solo token).
 */
export function AccessTokenConnectPanel({
  provider,
  config,
  onConnected,
}: {
  provider: IntegrationProviderDescriptor;
  config: AccessTokenConnectConfig;
  onConnected: (integration: IntegrationDTO) => void;
}) {
  const upsertIntegration = useIntegrationsStore((s) => s.upsertIntegration);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields: readonly CredentialFieldSpec[] = [
    config.external_account_field,
    ...config.credential_fields,
  ];
  const canSubmit = fields.every((field) => (values[field.id] ?? "").trim().length > 0);

  const submit = async () => {
    // Las reglas `validate` del descriptor son puras: se pagan antes de la red.
    const errors: Record<string, string> = {};
    for (const field of fields) {
      const message = field.validate?.((values[field.id] ?? "").trim()) ?? null;
      if (message !== null) errors[field.id] = message;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const integration = await connectIntegration(
        buildConnectPayload(config, provider.kind, values),
      );
      upsertIntegration(integration);
      onConnected(integration);
    } catch (err) {
      // El backend valida contra el proveedor REAL: un 422 trae el motivo exacto
      // (token malo, permisos faltantes, moneda distinta) y se muestra tal cual.
      setError(errorMessage(err, connectErrorFallback(provider)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !submitting) void submit();
      }}
    >
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
          </label>
          <Input
            id={field.id}
            type={field.secret === true ? "password" : "text"}
            value={values[field.id] ?? ""}
            placeholder={field.placeholder}
            autoComplete="off"
            onChange={(event) =>
              setValues((prev) => ({ ...prev, [field.id]: event.target.value }))
            }
          />
          {fieldErrors[field.id] !== undefined && (
            <p className="text-xs text-destructive">{fieldErrors[field.id]}</p>
          )}
          <p className="text-xs text-muted-foreground">{field.hint}</p>
        </div>
      ))}

      {error !== null && (
        <div className="flex gap-2.5 rounded-md border border-destructive/40 bg-destructive/[0.08] p-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={!canSubmit || submitting}>
        {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {submitting ? connectingLabel(provider) : connectCtaLabel(provider)}
      </Button>
    </form>
  );
}
