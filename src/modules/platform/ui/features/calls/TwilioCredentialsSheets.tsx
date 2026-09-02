"use client";

import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import type { CallAccount, CallCredentials } from "../../../domain/call-provisioning";
import {
  useCreateCallAccount,
  useRotateCallCredentials,
} from "../../../infrastructure/api/hooks/use-call-provisioning";

const PREREQUISITES = [
  "En la consola de Twilio: Account → Keys & credentials → API keys & tokens",
  "Copia el Account SID (empieza por AC) y el Auth Token de la cuenta",
  "El token viaja de aquí directo al API y no se vuelve a mostrar: solo sus últimos 4",
];

function buildCredentials(values: Record<string, string>): CallCredentials {
  return {
    mode: "auth_token",
    account_sid: values.account_sid ?? "",
    auth_token: values.auth_token ?? "",
  };
}

/** Los dos campos de la credencial de Twilio (alta y rotación comparten). */
function CredentialFields({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <>
      <div>
        <label className="text-sm font-semibold" htmlFor="cred-account_sid">
          Account SID
        </label>
        <p className="text-muted-foreground text-xs">Empieza por AC y tiene 34 caracteres</p>
        <Input
          id="cred-account_sid"
          className="mt-1"
          autoComplete="off"
          value={values.account_sid ?? ""}
          onChange={(event) => onChange("account_sid", event.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="cred-auth_token">
          Auth Token
        </label>
        <Input
          id="cred-auth_token"
          className="mt-1"
          type="password"
          autoComplete="off"
          value={values.auth_token ?? ""}
          onChange={(event) => onChange("auth_token", event.target.value)}
        />
      </div>
    </>
  );
}

/** Alta de la cuenta madre. Nace APAGADA: encenderla es una segunda decisión. */
export function ConnectTwilioSheet({ onClose }: { onClose: () => void }) {
  const create = useCreateCallAccount();
  const [label, setLabel] = useState("produccion");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    create.mutate(
      { label, credentials: buildCredentials(values) },
      {
        onSuccess: onClose,
        onError: (caught) => setError(errorMessage(caught, "Twilio rechazó la credencial")),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Conectar Twilio</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <SheetDescription>
            La cuenta madre de telefonía: con ella se compran números y se hacen las llamadas de
            todos los tenants. Se da de alta apagada — a partir del encendido empieza a costar
            dinero.
          </SheetDescription>

          <section className="border-border bg-secondary rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold">Antes de empezar</p>
            <ul className="flex flex-col gap-1.5">
              {PREREQUISITES.map((step) => (
                <li key={step} className="text-muted-foreground flex gap-2 text-xs">
                  <Check className="text-success mt-0.5 size-3 shrink-0" aria-hidden />
                  {step}
                </li>
              ))}
            </ul>
          </section>

          <div>
            <label className="text-sm font-semibold" htmlFor="account-label">
              Nombre de la cuenta
            </label>
            <Input
              id="account-label"
              className="mt-1"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <CredentialFields
            values={values}
            onChange={(id, value) => setValues((previous) => ({ ...previous, [id]: value }))}
          />

          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <Button disabled={create.isPending || label.trim().length === 0} onClick={submit}>
            {create.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {create.isPending ? "Consultando a Twilio…" : "Validar y guardar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function RotateTwilioCredentialsSheet({
  account,
  onClose,
}: {
  account: CallAccount;
  onClose: () => void;
}) {
  const rotate = useRotateCallCredentials();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    rotate.mutate(
      { id: account.id, credentials: buildCredentials(values) },
      {
        onSuccess: onClose,
        onError: (caught) => setError(errorMessage(caught, "Twilio rechazó la credencial")),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cambiar la llave de {account.label}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <SheetDescription>
            La llave actual termina en <span className="font-mono">···{account.token_last4 ?? "—"}</span>.
            La nueva se valida contra Twilio antes de guardarse; la anterior queda revocada.
          </SheetDescription>

          <CredentialFields
            values={values}
            onChange={(id, value) => setValues((previous) => ({ ...previous, [id]: value }))}
          />

          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <Button disabled={rotate.isPending} onClick={submit}>
            {rotate.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {rotate.isPending ? "Consultando a Twilio…" : "Validar y cambiar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
