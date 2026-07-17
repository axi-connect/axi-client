"use client";

/**
 * Banner post-alta con las credenciales del propietario. Se muestran UNA
 * sola vez: viven en sessionStorage efímero (las escribió el wizard), se
 * leen al montar y se borran al descartar — el backend jamás las devuelve.
 */
import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  PENDING_CREDENTIALS_KEY,
  type PendingOwnerCredentials,
} from "../../../../domain/tenant";
import { useCopy } from "../../../hooks/use-copy";

export function OwnerCredentialsBanner({ tenantId }: { tenantId: string }) {
  const [credentials, setCredentials] = useState<PendingOwnerCredentials | null>(null);
  const { copied, copy } = useCopy();

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PENDING_CREDENTIALS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PendingOwnerCredentials;
      // Solo aplican al tenant recién creado; para otro, se purgan.
      if (parsed.tenant_id === tenantId) setCredentials(parsed);
      else window.sessionStorage.removeItem(PENDING_CREDENTIALS_KEY);
    } catch {
      window.sessionStorage.removeItem(PENDING_CREDENTIALS_KEY);
    }
  }, [tenantId]);

  function dismiss() {
    window.sessionStorage.removeItem(PENDING_CREDENTIALS_KEY);
    setCredentials(null);
  }

  if (!credentials) return null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/40 bg-success/10 p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-medium">Tenant creado. Credenciales del propietario — guárdalas ahora:</p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate">{credentials.email}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{credentials.password}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void copy(`${credentials.email}\n${credentials.password}`)}
            >
              {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
              {copied ? "Copiadas" : "Copiar"}
            </Button>
          </p>
          <p className="text-xs text-muted-foreground">No volverán a mostrarse.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Descartar credenciales"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
