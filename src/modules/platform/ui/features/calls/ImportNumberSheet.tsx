"use client";

import { useState } from "react";
import { LoaderCircle, PhoneIncoming } from "lucide-react";
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
import type { OwnedTwilioNumber } from "../../../domain/call-provisioning";
import {
  useImportCallNumber,
  useOwnedNumbersQuery,
} from "../../../infrastructure/api/hooks/use-call-provisioning";

/**
 * Importar un número que la cuenta YA posee en Twilio (comprado en la
 * consola, o el del spike): entra al stock de axi sin comprar nada nuevo y
 * de ahí se asigna a un tenant como cualquier otro.
 */
export function ImportNumberSheet({
  accountId,
  onClose,
}: {
  accountId: string;
  onClose: () => void;
}) {
  const owned = useOwnedNumbersQuery(accountId);
  const importNumber = useImportCallNumber();
  const [selected, setSelected] = useState<OwnedTwilioNumber | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (selected === null) return;
    setError(null);
    importNumber.mutate(
      { provider_account_id: accountId, provider_sid: selected.provider_sid },
      {
        onSuccess: onClose,
        onError: (caught) => setError(errorMessage(caught, "No se pudo importar el número")),
      },
    );
  };

  const candidates = owned.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar de Twilio</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <SheetDescription>
            Estos son los números que la cuenta ya posee en Twilio. Importar uno lo registra en
            axi (no compra nada nuevo) y le apunta los webhooks; después se asigna a un tenant
            como cualquier otro.
          </SheetDescription>

          {owned.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : owned.isError ? (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {errorMessage(owned.error, "No se pudieron listar los números de Twilio")}
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              La cuenta no posee ningún número en Twilio. Compra uno desde «Comprar número».
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto" role="radiogroup">
              {candidates.map((candidate) => {
                const disabled = candidate.imported || !candidate.voice_capable;
                const isSelected = selected?.provider_sid === candidate.provider_sid;
                return (
                  <li key={candidate.provider_sid}>
                    <button
                      role="radio"
                      aria-checked={isSelected}
                      disabled={disabled}
                      onClick={() => setSelected(candidate)}
                      className={`border-border w-full rounded-lg border p-2.5 text-left text-sm transition-colors ${
                        disabled
                          ? "cursor-not-allowed opacity-50"
                          : isSelected
                            ? "bg-accent"
                            : "hover:bg-secondary"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono font-medium">{candidate.phone_number}</span>
                        {candidate.imported ? (
                          <span className="text-success text-[11px] font-medium">ya en axi</span>
                        ) : !candidate.voice_capable ? (
                          <span className="text-warning text-[11px] font-medium">sin voz</span>
                        ) : null}
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

          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <Button disabled={importNumber.isPending || selected === null} onClick={submit}>
            {importNumber.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <PhoneIncoming className="size-4" aria-hidden />
            )}
            {selected === null ? "Elige un número" : `Importar ${selected.phone_number}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
