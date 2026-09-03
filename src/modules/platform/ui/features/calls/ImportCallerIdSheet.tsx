"use client";

import { useState } from "react";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { OwnedCallerId } from "../../../domain/call-provisioning";
import {
  useImportCallerId,
  useOwnedCallerIdsQuery,
} from "../../../infrastructure/api/hooks/use-call-provisioning";

const TWILIO_VERIFIED_CALLER_IDS_URL =
  "https://console.twilio.com/us1/develop/phone-numbers/manage/verified";

/**
 * Importar un identificador de llamada VERIFICADO en Twilio (Verified Caller
 * ID): el número propio del negocio (+57…) que las salientes del tenant
 * mostrarán en vez del +1 de Twilio. No recibe llamadas ni compra nada; la
 * verificación (llamada con código de 6 dígitos) se hace hoy en la consola de
 * Twilio — la Fase 2 la traerá al panel del tenant.
 */
export function ImportCallerIdSheet({
  accountId,
  onClose,
}: {
  accountId: string;
  onClose: () => void;
}) {
  const verified = useOwnedCallerIdsQuery(accountId);
  const importCallerId = useImportCallerId();
  const [selected, setSelected] = useState<OwnedCallerId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (selected === null) return;
    setError(null);
    importCallerId.mutate(
      { provider_account_id: accountId, provider_sid: selected.provider_sid },
      {
        onSuccess: onClose,
        onError: (caught) =>
          setError(errorMessage(caught, "No se pudo importar el identificador")),
      },
    );
  };

  const candidates = verified.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar identificador de llamada</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <SheetDescription>
            Números <b>verificados</b> en Twilio (Verified Caller IDs). Al asignar uno a un tenant,
            sus llamadas salientes muestran ese número en vez del +1 de Twilio. No recibe llamadas
            ni compra nada: el número Twilio del tenant sigue siendo quien contesta.
          </SheetDescription>

          {verified.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : verified.isError ? (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {errorMessage(verified.error, "No se pudieron listar los identificadores de Twilio")}
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              La cuenta no tiene números verificados. Verifica uno en la consola de Twilio (te
              llama y pide un código de 6 dígitos) y vuelve aquí.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto" role="radiogroup">
              {candidates.map((candidate) => {
                const isSelected = selected?.provider_sid === candidate.provider_sid;
                return (
                  <li key={candidate.provider_sid}>
                    <button
                      role="radio"
                      aria-checked={isSelected}
                      disabled={candidate.imported}
                      onClick={() => setSelected(candidate)}
                      className={`border-border w-full rounded-lg border p-2.5 text-left text-sm transition-colors ${
                        candidate.imported
                          ? "cursor-not-allowed opacity-50"
                          : isSelected
                            ? "bg-accent"
                            : "hover:bg-secondary"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono font-medium">{candidate.phone_number}</span>
                        {candidate.imported && (
                          <span className="text-success text-[11px] font-medium">ya en axi</span>
                        )}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {candidate.friendly_name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <a
            href={TWILIO_VERIFIED_CALLER_IDS_URL}
            target="_blank"
            rel="noreferrer"
            className="text-accent-violet text-xs underline-offset-2 hover:underline"
          >
            Verificar un número nuevo en la consola de Twilio
          </a>

          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <Button disabled={importCallerId.isPending || selected === null} onClick={submit}>
            {importCallerId.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <BadgeCheck className="size-4" aria-hidden />
            )}
            {selected === null ? "Elige un identificador" : `Importar ${selected.phone_number}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
