"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { providerPlanOf, type TenantProviderKeyDTO } from "../../domain/person";
import {
  listMyProviderKeys,
  removeProviderKey,
  saveProviderKey,
} from "../../infrastructure/services/prospecting-service.adapter";

const PROVIDER = "apollo";

/**
 * «Apollo · tu llave» (Captación › Fuentes, P2).
 *
 * Apollo es la única fuente que usa la llave DEL NEGOCIO y no la de axi: sin
 * acuerdo de reventa, sus datos no se muestran con la llave de otro. La llave
 * se valida contra Apollo antes de guardarla, y después solo se enseñan sus
 * últimos cuatro caracteres.
 *
 * El plan importa y se dice sin dramatismo: con Apollo Free la llave vale para
 * empresas, no para personas. Eso no es un error de la llave.
 */
export function ApolloKeyCard({ onChanged }: { onChanged?: () => void }) {
  const { hasPermission } = useAuth();
  const { showAlert, showModal } = useAlert();
  const canManage = hasPermission("leads:manage");
  const inputId = useId();

  const [key, setKey] = useState<TenantProviderKeyDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    listMyProviderKeys()
      .then((result) => setKey(result.items.find((item) => item.provider === PROVIDER) ?? null))
      .catch((caught: unknown) =>
        setLoadError(errorMessage(caught, "Revisa tu conexión e intenta otra vez.")),
      );
  }, []);

  useEffect(() => load(), [load]);

  const plan = key === null ? "none" : providerPlanOf(key);
  const showForm = canManage && (plan === "none" || editing);

  async function onSave() {
    const value = draft.trim();
    if (value.length < 8) return;
    setSaving(true);
    try {
      await saveProviderKey(PROVIDER, value);
      setDraft("");
      setEditing(false);
      showAlert({ tone: "success", title: "Llave de Apollo guardada" });
      load();
      onChanged?.();
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se guardó la llave",
        description: errorMessage(caught, "Apollo no reconoció esa llave."),
      });
    } finally {
      setSaving(false);
    }
  }

  function onRemove() {
    showModal({
      title: "¿Quitar tu llave de Apollo?",
      description:
        "Dejarás de buscar y revelar personas. Las que ya revelaste se quedan en tu captación.",
      actions: [
        { label: "Cancelar", variant: "outline" },
        {
          label: "Quitar la llave",
          variant: "destructive",
          onClick: () => {
            void removeProviderKey(PROVIDER)
              .then(() => {
                showAlert({ tone: "success", title: "Llave de Apollo quitada" });
                load();
                onChanged?.();
              })
              .catch((caught: unknown) =>
                showAlert({ tone: "error", title: "No se quitó la llave", description: errorMessage(caught) }),
              );
          },
        },
      ],
    });
  }

  return (
    <BentoTile
      label="Apollo · tu llave"
      aside={
        key === null && loadError === null ? null : (
          <StatePill tone={plan === "people_and_companies" ? "success" : plan === "companies_only" ? "warning" : "neutral"}>
            {plan === "people_and_companies"
              ? "Personas y empresas"
              : plan === "companies_only"
                ? "Solo empresas"
                : "Sin llave"}
          </StatePill>
        )
      }
    >
      {key === null && loadError === null ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Cargando tu llave de Apollo">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : loadError !== null ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted-foreground text-sm">No pudimos leer tu llave: {loadError}</p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={load}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-muted-foreground text-sm text-pretty">
            Con tu llave buscas personas por cargo y empresa. Buscar no gasta créditos; revelar sí, de tu saldo en
            Apollo y solo si lo encuentra
            {key !== null && key.credit_costs.email !== null && key.credit_costs.phone !== null
              ? `: ${String(key.credit_costs.email)} por el correo y ${String(key.credit_costs.phone)} por el celular.`
              : "."}
          </p>

          {key !== null && key.configured && (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Llave</dt>
              <dd className="font-mono tabular-nums">•••• {key.token_last4}</dd>
              <dt className="text-muted-foreground">Este mes</dt>
              <dd className="tabular-nums">
                {key.calls_this_month.toLocaleString("es-CO")}{" "}
                {key.calls_this_month === 1 ? "consulta" : "consultas"}
              </dd>
            </dl>
          )}

          {plan === "companies_only" && (
            <Alert variant="info">
              <KeyRound />
              <AlertTitle>Tu plan de Apollo no incluye la API de personas</AlertTitle>
              <AlertDescription>
                La usamos para completar empresas. Para buscar y revelar personas, Apollo pide un plan pago.
              </AlertDescription>
            </Alert>
          )}
          {key !== null && key.configured && key.healthy === false && key.last_error !== null && (
            <Alert variant="warning">
              <KeyRound />
              <AlertTitle>Apollo no está respondiendo con esta llave</AlertTitle>
              <AlertDescription>{key.last_error}</AlertDescription>
            </Alert>
          )}

          {showForm ? (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                void onSave();
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor={inputId} className="text-sm font-medium">
                  Llave maestra de Apollo
                </label>
                <Input
                  id={inputId}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Pégala aquí"
                />
              </div>
              <div className="flex gap-2">
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => {
                      setEditing(false);
                      setDraft("");
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="rounded-full" disabled={saving || draft.trim().length < 8}>
                  {saving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
                  {saving ? "Validando…" : "Guardar llave"}
                </Button>
              </div>
            </form>
          ) : (
            canManage &&
            key !== null &&
            key.configured && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(true)}>
                  Cambiar la llave
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive rounded-full" onClick={onRemove}>
                  Quitar
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </BentoTile>
  );
}
