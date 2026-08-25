"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, RefreshCw, TriangleAlert, Unplug } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import {
  buildRotatePayload,
  integrationProvider,
  type AccessTokenConnectConfig,
  type IntegrationProviderDescriptor,
} from "@/modules/integrations/domain/integration-providers";
import {
  disconnectIntegration,
  rotateIntegrationCredentials,
  startIntegrationSync,
} from "@/modules/integrations/infrastructure/services/integrations-service.adapter";
import { useIntegrationsStore } from "@/modules/integrations/infrastructure/stores/integrations.store";
import { OAuthConnectPanel } from "../connect/OAuthConnectPanel";

/**
 * Pestaña Estado: salud de la conexión + las tres acciones de gestión.
 * Rotar credenciales es también la vía de RECUPERACIÓN: tras un
 * `app/uninstalled` o un token revocado, un token nuevo válido vuelve a dejar
 * la conexión en `connected` y re-suscribe los webhooks.
 *
 * Desde F9 la acción de recuperación depende de la estrategia del registry:
 * `access_token` rota credenciales con los campos del descriptor;
 * `oauth` reconecta re-autorizando desde el proveedor.
 */
export function EstadoTab({
  integration,
  onChanged,
}: {
  integration: IntegrationDTO;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const removeIntegration = useIntegrationsStore((s) => s.removeIntegration);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const provider = integrationProvider(integration.provider);
  const rotateConfig = provider.connect.strategy === "access_token" ? provider.connect : null;

  const sync = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      await startIntegrationSync(integration.id, "backfill");
      setNotice("Sincronización lanzada: sigue su avance en la pestaña Historial.");
    } catch (err) {
      setNotice(errorMessage(err, "No se pudo lanzar la sincronización"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {integration.last_error !== null && (
        <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/[0.08] p-4">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-destructive" />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">La conexión reportó un problema</p>
            <p className="text-muted-foreground">{integration.last_error}</p>
          </div>
        </div>
      )}

      <dl className="grid gap-x-8 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-2 md:p-6">
        <Row label="Cuenta remota" value={integration.external_account} />
        <Row
          label="Última sincronización"
          value={
            integration.last_synced_at !== null ? (
              <RelativeDate iso={integration.last_synced_at} />
            ) : (
              "Todavía no corre"
            )
          }
        />
        <Row
          label="Credenciales"
          value={
            integration.credentials_configured
              ? `Configuradas${integration.token_last4 !== null ? ` · termina en ${integration.token_last4}` : ""}`
              : "Sin credenciales activas"
          }
        />
        <Row label="Versión de API" value={integration.api_version} />
        <Row
          label="Permisos concedidos"
          value={integration.granted_scopes.join(", ") || "—"}
        />
        <Row
          label="Conectada"
          value={
            integration.connected_at !== null ? (
              <RelativeDate iso={integration.connected_at} />
            ) : (
              "—"
            )
          }
        />
      </dl>

      {notice !== null && <p className="text-sm text-muted-foreground">{notice}</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void sync()} disabled={syncing}>
          {syncing ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="size-4" />
          )}
          Sincronizar ahora
        </Button>
        <Button variant="outline" onClick={() => setRotateOpen(true)}>
          <KeyRound aria-hidden="true" className="size-4" />
          {rotateConfig !== null ? "Rotar credenciales" : `Reconectar con ${provider.label}`}
        </Button>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setDisconnectOpen(true)}
        >
          <Unplug aria-hidden="true" className="size-4" />
          Desconectar
        </Button>
      </div>

      {rotateConfig !== null ? (
        <RotateCredentialsDialog
          integrationId={integration.id}
          provider={provider}
          config={rotateConfig}
          open={rotateOpen}
          onOpenChange={setRotateOpen}
          onRotated={onChanged}
        />
      ) : (
        <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reconectar con {provider.label}</DialogTitle>
              <DialogDescription>
                Vuelves a autorizar el acceso desde tu {provider.noun.singular} de{" "}
                {provider.label}: es la vía de recuperación cuando el permiso se revocó o expiró.
              </DialogDescription>
            </DialogHeader>
            <OAuthConnectPanel provider={provider} />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Desconectar esta integración?</DialogTitle>
            <DialogDescription>
              Tu catálogo espejado NO se borra: los productos quedan congelados con su último
              estado y vuelven a ser editables. Los avisos de tu {provider.noun.singular} dejan de
              llegar. Puedes volver a conectarla cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void disconnectIntegration(integration.id).then(() => {
                  removeIntegration(integration.id);
                  router.push("/settings/integrations");
                });
              }}
            >
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Rotación por credenciales: los campos salen del MISMO descriptor que el alta
 * (F9) — sin `external_account_field`, porque la cuenta remota no cambia al
 * rotar. El payload lo arma `buildRotatePayload`, igual que el wizard.
 */
function RotateCredentialsDialog({
  integrationId,
  provider,
  config,
  open,
  onOpenChange,
  onRotated,
}: {
  integrationId: string;
  provider: IntegrationProviderDescriptor;
  config: AccessTokenConnectConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRotated: () => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = config.credential_fields.every(
    (field) => (values[field.id] ?? "").trim().length > 0,
  );

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await rotateIntegrationCredentials(integrationId, buildRotatePayload(config, values));
      setValues({});
      onOpenChange(false);
      await onRotated();
    } catch (err) {
      setError(errorMessage(err, "No se pudieron rotar las credenciales"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rotar credenciales</DialogTitle>
          <DialogDescription>
            Se validan contra tu {provider.noun.singular} antes de guardarse: si algo falla, las
            anteriores siguen funcionando. Es también la vía para reconectar si desinstalaste la
            app en {provider.label}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {config.credential_fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={`rotate-${field.id}`} className="text-sm font-medium">
                {field.label}
              </label>
              <Input
                id={`rotate-${field.id}`}
                type={field.secret === true ? "password" : "text"}
                value={values[field.id] ?? ""}
                placeholder={field.placeholder}
                autoComplete="off"
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.id]: event.target.value }))
                }
              />
            </div>
          ))}
          {error !== null && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={() => void submit()}>
            {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value}</dd>
    </div>
  );
}
