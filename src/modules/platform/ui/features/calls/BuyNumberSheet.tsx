"use client";

import { useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
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
import type { AvailableNumber } from "../../../domain/call-provisioning";
import {
  useBuyCallNumber,
  useSearchCallNumbers,
} from "../../../infrastructure/api/hooks/use-call-provisioning";

/** Buscar es gratis; comprar es GASTO RECURRENTE (renta mensual del número). */
export function BuyNumberSheet({
  accountId,
  onClose,
}: {
  accountId: string;
  onClose: () => void;
}) {
  const search = useSearchCallNumbers();
  const buy = useBuyCallNumber();
  const [countryCode, setCountryCode] = useState("CO");
  const [contains, setContains] = useState("");
  const [selected, setSelected] = useState<AvailableNumber | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = () => {
    setError(null);
    setSelected(null);
    search.mutate(
      {
        provider_account_id: accountId,
        country_code: countryCode.trim().toUpperCase(),
        contains: contains.trim() || undefined,
      },
      { onError: (caught) => setError(errorMessage(caught, "La búsqueda falló")) },
    );
  };

  const runBuy = () => {
    if (selected === null) return;
    setError(null);
    buy.mutate(
      {
        provider_account_id: accountId,
        phone_number: selected.phone_number,
        country_code: countryCode.trim().toUpperCase(),
      },
      {
        onSuccess: onClose,
        onError: (caught) => setError(errorMessage(caught, "Twilio rechazó la compra")),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Comprar un número</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <SheetDescription>
            El número entra al stock de axi y luego se asigna a un tenant. Comprarlo crea una
            renta mensual en Twilio hasta que se libere.
          </SheetDescription>

          <div className="flex items-end gap-2">
            <div className="w-20">
              <label className="text-sm font-semibold" htmlFor="buy-country">
                País
              </label>
              <Input
                id="buy-country"
                className="mt-1"
                maxLength={2}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label className="text-sm font-semibold" htmlFor="buy-contains">
                Contiene (opcional)
              </label>
              <Input
                id="buy-contains"
                className="mt-1"
                placeholder="601*"
                value={contains}
                onChange={(event) => setContains(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={search.isPending || countryCode.trim().length !== 2}
              onClick={runSearch}
            >
              {search.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Search className="size-4" aria-hidden />
              )}
              Buscar
            </Button>
          </div>

          {search.data !== undefined && search.data.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Twilio no tiene números disponibles con ese criterio.
            </p>
          )}

          {(search.data ?? []).length > 0 && (
            <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto" role="radiogroup">
              {(search.data ?? []).map((candidate) => {
                const isSelected = selected?.phone_number === candidate.phone_number;
                return (
                  <li key={candidate.phone_number}>
                    <button
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelected(candidate)}
                      className={`border-border w-full rounded-lg border p-2.5 text-left text-sm transition-colors ${
                        isSelected ? "bg-accent" : "hover:bg-secondary"
                      }`}
                    >
                      <span className="font-mono font-medium">{candidate.phone_number}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {[candidate.locality, candidate.region].filter(Boolean).join(", ") ||
                          candidate.friendly_name}
                        {candidate.capabilities.voice ? "" : " · SIN voz"}
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

          <Button disabled={buy.isPending || selected === null} onClick={runBuy}>
            {buy.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {selected === null ? "Elige un número" : `Comprar ${selected.phone_number}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
