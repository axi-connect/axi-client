"use client";

import { useState } from "react";
import { LoaderCircle, Search } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

import type { SearchSource, SourceCatalogItemDTO } from "../../domain/search";
import {
  startSearch,
  type StartSearchInput,
} from "../../infrastructure/services/prospecting-service.adapter";

/** Topes que ofrece la interfaz. El backend acepta hasta 500. */
const LIMITS = [25, 50, 100, 200, 500];

/**
 * Lanzar una búsqueda.
 *
 * **El tope es un campo obligatorio, no un ajuste avanzado.** No existe
 * «búscame todos»: es la única forma honesta de que el dueño sepa el techo del
 * gasto antes de aceptarlo. Por eso el botón dice cuántas unidades puede costar
 * como máximo, y por eso una fuente gratis lo dice en el mismo sitio.
 */
export function StartSearchSheet({
  open,
  sources,
  initial,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  sources: SourceCatalogItemDTO[];
  initial?: Partial<StartSearchInput>;
  onOpenChange: (open: boolean) => void;
  onStarted: () => void;
}) {
  const { showAlert } = useAlert();
  const usable = sources.filter((source) => source.available);
  const [form, setForm] = useState<StartSearchInput>({
    source: initial?.source ?? usable[0]?.source ?? "openstreetmap",
    text: initial?.text,
    category: initial?.category,
    city: initial?.city,
    limit: initial?.limit ?? 50,
  });
  const [saving, setSaving] = useState(false);

  const chosen = usable.find((source) => source.source === form.source);
  const set = (patch: Partial<StartSearchInput>) =>
    setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    setSaving(true);
    try {
      await startSearch({
        ...form,
        // Los vacíos no viajan: un `text: ""` cambia la consulta del proveedor.
        text: blankToUndefined(form.text),
        category: blankToUndefined(form.category),
        city: blankToUndefined(form.city),
      });
      showAlert({
        tone: "success",
        title: "Búsqueda lanzada",
        description: "Verás los resultados llegar aquí mismo.",
      });
      onOpenChange(false);
      onStarted();
    } catch (caught) {
      showAlert({ tone: "error", title: errorMessage(caught) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Buscar negocios</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div>
            <label className="text-sm font-semibold" htmlFor="search-source">
              Dónde buscar
            </label>
            <Select
              value={form.source}
              onValueChange={(value) => set({ source: value as SearchSource })}
            >
              <SelectTrigger id="search-source" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usable.map((source) => (
                  <SelectItem key={source.source} value={source.source}>
                    {source.label}
                    {source.free && " · gratis"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="search-category">
              Qué negocios
            </label>
            <p className="text-muted-foreground text-xs">
              Una categoría: restaurante, hotel, panadería, ferretería.
            </p>
            <Input
              id="search-category"
              className="mt-1"
              value={form.category ?? ""}
              onChange={(event) => set({ category: event.target.value })}
              placeholder="restaurante"
            />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="search-city">
              Dónde
            </label>
            <Input
              id="search-city"
              className="mt-1"
              value={form.city ?? ""}
              onChange={(event) => set({ city: event.target.value })}
              placeholder="Bogotá"
            />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="search-limit">
              Cuántos como máximo
            </label>
            <p className="text-muted-foreground text-xs">
              La búsqueda se detiene aquí. Es tu techo de gasto.
            </p>
            <Select
              value={String(form.limit)}
              onValueChange={(value) => set({ limit: Number(value) })}
            >
              <SelectTrigger id="search-limit" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMITS.map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit.toLocaleString("es-CO")} negocios
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {chosen !== undefined && !chosen.allowed_channels.includes("whatsapp") && (
            // Se dice ANTES de gastar, no después de descubrir doscientos.
            <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-sm">
              Estos negocios no pidieron que los contactaras, así que solo
              podrás escribirles por correo o a mano. WhatsApp queda fuera.
            </p>
          )}

          <Button className="w-full" disabled={saving} onClick={() => void submit()}>
            {saving ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Search aria-hidden="true" />
            )}
            {chosen?.free === true
              ? "Buscar · gratis"
              : `Buscar · hasta ${form.limit.toLocaleString("es-CO")} unidades`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
