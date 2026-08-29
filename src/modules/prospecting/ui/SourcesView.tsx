"use client";

import { useEffect, useState } from "react";
import { Globe, MapPin, Search } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Badge } from "@/shared/components/ui/badge";
import { PageHeader } from "@/shared/components/layout/page-header";

import { CHANNEL_LABELS } from "../domain/lead";
import type { SearchSource, SourceCatalogItemDTO } from "../domain/search";
import { listSources } from "../infrastructure/services/prospecting-service.adapter";

const ICONS: Record<SearchSource, typeof MapPin> = {
  google_places: MapPin,
  openstreetmap: Globe,
  serp: Search,
};

/** Qué aporta cada fuente, dicho por lo que el dueño va a obtener. */
const PITCH: Record<SearchSource, string> = {
  google_places:
    "El catálogo más completo de Colombia: nombre, dirección y teléfono de casi cualquier negocio con puerta a la calle.",
  openstreetmap:
    "Mapa libre y gratuito. Trae menos negocios y casi nunca el correo, pero no gasta unidades de tu plan.",
  serp: "Resultados del buscador. Encuentra al que existe en la web sin estar en ningún mapa: agencias, mayoristas, servicios a domicilio.",
};

/**
 * De dónde traemos leads.
 *
 * Existe para responder una pregunta antes de gastar: **qué se puede hacer con
 * lo que traiga cada fuente.** Que un negocio sacado de un mapa no se pueda
 * tocar por WhatsApp se aprende aquí, no después de descubrir doscientos —y por
 * eso los canales permitidos están en la tarjeta y no en una nota al pie.
 */
export function SourcesView() {
  const { showAlert } = useAlert();
  const [sources, setSources] = useState<SourceCatalogItemDTO[] | null>(null);

  useEffect(() => {
    listSources()
      .then((catalog) => setSources(catalog.items))
      .catch((caught: unknown) => {
        showAlert({ tone: "error", title: errorMessage(caught) });
        setSources([]);
      });
  }, [showAlert]);

  if (sources === null) return <BrandLoader />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="De dónde traemos leads"
        description="Las llaves las pone axi. Tú eliges la fuente y pagas por lo que uses, contra la cuota de tu plan."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {sources.map((source) => {
          const Icon = ICONS[source.source];
          return (
            <article
              key={source.source}
              className="border-border bg-card flex flex-col gap-3 rounded-lg border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <h3 className="font-semibold">{source.label}</h3>
                </div>
                <Badge variant="outline">
                  {source.available
                    ? source.free
                      ? "Gratis"
                      : "Consume unidades"
                    : "No disponible"}
                </Badge>
              </div>

              <p className="text-muted-foreground text-sm">{PITCH[source.source]}</p>

              <div className="mt-auto">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Cómo podrás contactarlos
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {source.allowed_channels.map((channel) => (
                    <Badge key={channel} variant="secondary">
                      {CHANNEL_LABELS[channel]}
                    </Badge>
                  ))}
                </div>
              </div>

              {source.attribution !== null && (
                // No es letra pequeña: la ODbL permite el uso comercial CITANDO
                // la fuente, así que la cita es la condición bajo la que ese
                // dato es nuestro para usarlo.
                <p className="text-muted-foreground text-xs">{source.attribution}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
