"use client";

import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

import {
  buildCredentials,
  PROVIDER_DESCRIPTORS,
  type CredentialMode,
  type ProviderAccount,
  type ProviderName,
} from "@/modules/platform/domain/prospecting-providers";
import {
  useCreateProvider,
  useRotateCredentials,
} from "@/modules/platform/infrastructure/api/hooks/use-prospecting-providers";

/**
 * Pegar una llave.
 *
 * Los prerrequisitos van ARRIBA y no en una ayuda escondida: quien abre esto
 * casi siempre todavía no tiene la llave, y decirle dónde sacarla es la mitad
 * del trabajo de la pantalla.
 *
 * El botón dice «Validar y guardar» porque eso es literalmente lo que pasa: el
 * backend llama al proveedor ANTES de guardar. Puede tardar unos segundos y una
 * llave mala se rechaza aquí, no días después en silencio.
 */
function CredentialFields({
  provider,
  values,
  onChange,
}: {
  provider: ProviderName;
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  const descriptor = PROVIDER_DESCRIPTORS[provider];
  if (descriptor.fields.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta fuente es pública: no hay ninguna llave que pegar.
      </p>
    );
  }
  return (
    <>
      {descriptor.fields.map((field) => (
        <div key={field.id}>
          <label className="text-sm font-semibold" htmlFor={`cred-${field.id}`}>
            {field.label}
          </label>
          {field.hint !== undefined && (
            <p className="text-muted-foreground text-xs">{field.hint}</p>
          )}
          <Input
            id={`cred-${field.id}`}
            className="mt-1"
            // `password` en los secretos y `off` en el autocompletado: una llave
            // de producción no tiene por qué quedarse en el gestor del navegador.
            type={field.secret ? "password" : "text"}
            autoComplete="off"
            value={values[field.id] ?? ""}
            onChange={(event) => onChange(field.id, event.target.value)}
          />
        </div>
      ))}
    </>
  );
}

export function ConnectProviderSheet({
  provider,
  credentialMode,
  onClose,
}: {
  provider: ProviderName;
  credentialMode: CredentialMode;
  onClose: () => void;
}) {
  const descriptor = PROVIDER_DESCRIPTORS[provider];
  const create = useCreateProvider();
  const [label, setLabel] = useState("produccion");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    create.mutate(
      {
        provider,
        label,
        credentials: buildCredentials(credentialMode, values),
      },
      {
        onSuccess: onClose,
        onError: (caught) =>
          setError(errorMessage(caught, "El proveedor rechazó la credencial")),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Conectar {descriptor.label}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <p className="text-muted-foreground text-sm">{descriptor.tagline}</p>

          <section className="border-border bg-secondary rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold">Antes de empezar</p>
            <ul className="flex flex-col gap-1.5">
              {descriptor.prerequisites.map((step) => (
                <li
                  key={step}
                  className="text-muted-foreground flex gap-2 text-xs"
                >
                  <Check
                    className="text-success mt-0.5 size-3 shrink-0"
                    aria-hidden
                  />
                  {step}
                </li>
              ))}
            </ul>
          </section>

          {descriptor.note !== undefined && (
            <p className="text-warning/90 bg-warning/8 border-warning/25 rounded-md border px-3 py-2 text-xs">
              {descriptor.note}
            </p>
          )}

          <div>
            <label className="text-sm font-semibold" htmlFor="provider-label">
              Nombre de la cuenta
            </label>
            <p className="text-muted-foreground text-xs">
              Para distinguir dos cuentas del mismo proveedor
            </p>
            <Input
              id="provider-label"
              className="mt-1"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <CredentialFields
            provider={provider}
            values={values}
            onChange={(id, value) =>
              setValues((previous) => ({ ...previous, [id]: value }))
            }
          />

          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <Button
            disabled={create.isPending || label.trim().length === 0}
            onClick={submit}
          >
            {create.isPending && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            )}
            {create.isPending
              ? "Consultando al proveedor…"
              : "Validar y guardar"}
          </Button>
          <p className="text-muted-foreground text-xs">
            Se comprueba la llave contra el proveedor antes de guardarla. La
            cuenta queda
            <strong className="text-foreground"> apagada</strong>: encenderla es
            una decisión aparte, porque a partir de ahí empieza a costar dinero.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Rotar la llave de una cuenta que ya existe. */
export function RotateCredentialsSheet({
  account,
  onClose,
}: {
  account: ProviderAccount;
  onClose: () => void;
}) {
  const descriptor = PROVIDER_DESCRIPTORS[account.provider];
  const rotate = useRotateCredentials();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const mode: CredentialMode =
    descriptor.fields.length === 0
      ? "none"
      : descriptor.fields.length > 1
        ? "key_secret"
        : "api_key";

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cambiar la llave de {descriptor.label}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <p className="text-muted-foreground text-sm">
            La llave actual termina en{" "}
            <strong>···{account.token_last4 ?? "—"}</strong>. La anterior se
            conserva en el historial: cambiarla no es borrarla.
          </p>

          <CredentialFields
            provider={account.provider}
            values={values}
            onChange={(id, value) =>
              setValues((previous) => ({ ...previous, [id]: value }))
            }
          />

          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <Button
            disabled={rotate.isPending}
            onClick={() => {
              setError(null);
              rotate.mutate(
                { id: account.id, credentials: buildCredentials(mode, values) },
                {
                  onSuccess: onClose,
                  onError: (caught) =>
                    setError(
                      errorMessage(
                        caught,
                        "El proveedor rechazó la credencial",
                      ),
                    ),
                },
              );
            }}
          >
            {rotate.isPending && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            )}
            {rotate.isPending
              ? "Consultando al proveedor…"
              : "Validar y cambiar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
